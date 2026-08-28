import Opportunity from './opportunity.model.js';
import Lead from '../leads/lead.model.js';
import User from '../users/user.model.js';
import Quotation from '../quotations/quotation.model.js';
import Project from '../projects/project.service.js';
import Invoice from '../finance/invoice.service.js';
import Client from '../clients/client.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Service-level ownership check for opportunities.
 */
const assertOpportunityAccess = (opportunity, user) => {
  const isOwner = opportunity.assignedTo?.toString() === user._id?.toString();
  const isCreator = opportunity.createdBy?.toString() === user._id?.toString();
  const isPrivileged = assertOwnershipOrPrivileged(null, user, PRIVILEGED_ROLES);

  if (!isOwner && !isCreator && !isPrivileged) {
    throw new AppError('You do not have access to this opportunity', 403, 'OPPORTUNITY_ACCESS_DENIED');
  }
};

/**
 * Build filter with ownership visibility.
 */
const buildFilter = (query, user) => {
  const filter = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.stage) {
    filter.stage = query.stage;
  }

  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  if (query.client) {
    filter.client = query.client;
  }

  if (query.lead) {
    filter.lead = query.lead;
  }

  // Value range
  if (query.valueMin !== undefined || query.valueMax !== undefined) {
    filter.value = {};
    if (query.valueMin !== undefined) filter.value.$gte = query.valueMin;
    if (query.valueMax !== undefined) filter.value.$lte = query.valueMax;
  }

  // Expected close date range
  if (query.expectedCloseFrom || query.expectedCloseTo) {
    filter.expectedCloseDate = {};
    if (query.expectedCloseFrom) filter.expectedCloseDate.$gte = new Date(query.expectedCloseFrom);
    if (query.expectedCloseTo) filter.expectedCloseDate.$lte = new Date(query.expectedCloseTo);
  }

  // Ownership visibility: sales users only see their own opportunities
  const roleName = user.role?.name;
  if (roleName === 'sales') {
    filter.$or = [
      { assignedTo: user._id },
      { createdBy: user._id },
    ];
  }

  return filter;
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new opportunity.
 */
export const createOpportunity = async (data, user) => {
  // Validate assigned user
  if (data.assignedTo) {
    const assignee = await User.findById(data.assignedTo);
    if (!assignee) {
      throw new AppError('Assigned user not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!assignee.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  // Validate lead exists if provided
  if (data.lead) {
    const lead = await Lead.findById(data.lead);
    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }
  }

  const opportunity = await Opportunity.create({
    ...data,
    createdBy: user._id,
  });

  logger.info(`Opportunity created: ${opportunity.title} by ${user.email}`);
  return opportunity;
};

/**
 * List opportunities with search, filters, and pagination.
 */
export const getOpportunities = async (query, user) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user);

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  if (query.search) {
    sort.score = { $meta: 'textScore' };
  }

  const [opportunities, total] = await Promise.all([
    Opportunity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('lead', 'name company')
      .populate('client', 'companyName')
      .lean(),
    Opportunity.countDocuments(filter),
  ]);

  return {
    opportunities,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single opportunity by ID.
 */
export const getOpportunityById = async (id, user) => {
  const opportunity = await Opportunity.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('lead', 'name company email phone')
    .populate('client', 'companyName primaryContact')
    .lean();

  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  return opportunity;
};

/**
 * Update an opportunity.
 */
export const updateOpportunity = async (id, updates, user) => {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  assertOpportunityAccess(opportunity, user);

  // Prevent changing critical fields through generic update
  delete updates.createdBy;
  delete updates.stage;
  delete updates.lostReason;
  delete updates.wonAt;

  Object.assign(opportunity, updates);
  await opportunity.save();

  logger.info(`Opportunity updated: ${opportunity.title} by ${user.email}`);
  return opportunity;
};

/**
 * Delete an opportunity (admin/management only).
 */
export const deleteOpportunity = async (id, user) => {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  const roleName = user.role?.name;
  if (!PRIVILEGED_ROLES.includes(roleName)) {
    throw new AppError('Only admin or management can delete opportunities', 403, 'OPPORTUNITY_ACCESS_DENIED');
  }

  await Opportunity.findByIdAndDelete(id);
  logger.info(`Opportunity deleted: ${opportunity.title} by ${user.email}`);
};

// ─── Business Actions ────────────────────────────────────────────────────────

/**
 * Assign an opportunity to a user.
 */
export const assignOpportunity = async (id, assignedToId, user) => {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  assertOpportunityAccess(opportunity, user);

  const assignee = await User.findById(assignedToId);
  if (!assignee) {
    throw new AppError('Assigned user not found', 400, 'INVALID_ASSIGNMENT');
  }
  if (!assignee.isActive) {
    throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
  }

  const previousAssignee = opportunity.assignedTo;
  opportunity.assignedTo = assignedToId;
  await opportunity.save();

  logger.info(`Opportunity assigned: ${opportunity.title} → ${assignee.email} by ${user.email}`);
  return { opportunity, previousAssignee, assignedTo: assignee };
};

/**
 * Change opportunity stage with transition validation.
 */
export const changeStage = async (id, newStage, user) => {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  assertOpportunityAccess(opportunity, user);

  if (!Opportunity.isValidTransition(opportunity.stage, newStage)) {
    throw new AppError(
      `Cannot transition from "${opportunity.stage}" to "${newStage}"`,
      400,
      'INVALID_STAGE_TRANSITION',
      { currentStage: opportunity.stage, requestedStage: newStage },
    );
  }

  const previousStage = opportunity.stage;
  opportunity.stage = newStage;
  await opportunity.save();

  logger.info(`Opportunity stage: ${opportunity.title} ${previousStage} → ${newStage} by ${user.email}`);
  return { opportunity, previousStage };
};

/**
 * Mark opportunity as lost.
 */
export const markLost = async (id, reason, user) => {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  assertOpportunityAccess(opportunity, user);

  // Must not already be won or lost
  if (opportunity.stage === 'won') {
    throw new AppError('Cannot mark a won opportunity as lost', 400, 'OPPORTUNITY_ALREADY_WON');
  }
  if (opportunity.stage === 'lost') {
    throw new AppError('Opportunity is already lost', 400, 'OPPORTUNITY_ALREADY_LOST');
  }

  // Must be in a stage that allows lost
  if (!Opportunity.isValidTransition(opportunity.stage, 'lost')) {
    throw new AppError(
      `Cannot mark as lost from stage "${opportunity.stage}"`,
      400,
      'INVALID_STAGE_TRANSITION',
      { currentStage: opportunity.stage },
    );
  }

  opportunity.stage = 'lost';
  opportunity.lostReason = reason;
  await opportunity.save();

  logger.info(`Opportunity lost: ${opportunity.title} — ${reason} by ${user.email}`);
  return opportunity;
};

/**
 * Mark opportunity as won.
 * Creates the opportunity-won boundary for Phase 4/5 integration.
 */
export const markWon = async (id, user, _quotationId = null) => {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  assertOpportunityAccess(opportunity, user);

  // Must not already be won or lost
  if (opportunity.stage === 'won') {
    throw new AppError('Opportunity is already won', 400, 'OPPORTUNITY_ALREADY_WON');
  }
  if (opportunity.stage === 'lost') {
    throw new AppError('Cannot mark a lost opportunity as won', 400, 'OPPORTUNITY_ALREADY_LOST');
  }

  // Must be in negotiation to win
  if (!Opportunity.isValidTransition(opportunity.stage, 'won')) {
    throw new AppError(
      `Cannot mark as won from stage "${opportunity.stage}". Must be in "negotiation".`,
      400,
      'INVALID_STAGE_TRANSITION',
      { currentStage: opportunity.stage, requiredStage: 'negotiation' },
    );
  }

  // Phase 4 — Quotation validation
  // Find accepted quotation for this opportunity
  const acceptedQuotation = await Quotation.findOne({
    opportunity: id,
    status: 'accepted',
  }).sort({ createdAt: -1 }).lean();

  if (!acceptedQuotation) {
    throw new AppError(
      'No accepted quotation found for this opportunity. Create and accept a quotation before marking as won.',
      400,
      'NO_ACCEPTED_QUOTATION',
    );
  }

  // If a specific quotationId was provided, validate it matches
  if (_quotationId) {
    if (acceptedQuotation._id.toString() !== _quotationId) {
      throw new AppError(
        'The provided quotation is not the accepted quotation for this opportunity',
        400,
        'QUOTATION_OPPORTUNITY_MISMATCH',
      );
    }
  }

  opportunity.stage = 'won';
  opportunity.wonAt = new Date();
  opportunity.probability = 100;
  await opportunity.save();

  // ─── Phase 5: Sales-to-Project Handover ────────────────────────────────
  // Create Project from the Won opportunity
  const projectData = {
    name: `${opportunity.title} — Project`,
    client: opportunity.client || acceptedQuotation.client,
    sourceOpportunity: opportunity._id,
    sourceQuotation: acceptedQuotation._id,
    manager: null,
    team: [],
    status: 'planned',
    startDate: null,
    endDate: null,
    budget: acceptedQuotation.total || 0,
    currency: acceptedQuotation.currency || opportunity.currency || 'INR',
    createdBy: user._id,
  };

  const project = await Project.createFromHandover(projectData);

  // Update project reference on opportunity
  opportunity.project = project._id;
  await opportunity.save();

  // ─── Phase 6: Create Draft Invoice ──────────────────────────────────────
  let draftInvoice = null;
  if (acceptedQuotation.items && acceptedQuotation.items.length > 0) {
    draftInvoice = await Invoice.createDraftFromHandover({
      client: projectData.client,
      project: project._id,
      opportunity: opportunity._id,
      quotation: acceptedQuotation._id,
      items: acceptedQuotation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent,
      })),
      currency: acceptedQuotation.currency || 'INR',
      createdBy: user._id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });
  }

  logger.info(`Opportunity won: ${opportunity.title} with quotation ${acceptedQuotation.quotationNumber} by ${user.email}`);

  return {
    opportunity,
    acceptedQuotation,
    project,
    draftInvoice,
    message: 'Opportunity won. Project and draft invoice created.',
  };
};

/**
 * Create an opportunity from a qualified lead.
 * Called by lead.service.js during conversion.
 */
export const createFromLead = async (lead, user) => {
  const opportunity = await Opportunity.create({
    title: `${lead.name} — ${lead.company || 'Direct'}`,
    lead: lead._id,
    value: 0,
    currency: 'INR',
    probability: 20,
    stage: 'prospecting',
    assignedTo: lead.assignedTo || user._id,
    createdBy: user._id,
  });

  logger.info(`Opportunity created from lead: ${lead.name} → ${opportunity.title}`);
  return opportunity;
};

export default {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity,
  assignOpportunity,
  changeStage,
  markLost,
  markWon,
  createFromLead,
};
