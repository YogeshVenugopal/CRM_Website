import Lead from './lead.model.js';
import User from '../users/user.model.js';
import Opportunity from '../pipeline/opportunity.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

// ─── Privileged roles that bypass ownership checks ───────────────────────────
const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verify the user can modify this lead (RBAC + ownership).
 * Service-level check — never trust route-level alone.
 */
const assertLeadAccess = (lead, user) => {
  const isOwner = lead.assignedTo?.toString() === user._id?.toString();
  const isCreator = lead.createdBy?.toString() === user._id?.toString();
  const isPrivileged = assertOwnershipOrPrivileged(null, user, PRIVILEGED_ROLES);

  if (!isOwner && !isCreator && !isPrivileged) {
    throw new AppError('You do not have access to this lead', 403, 'LEAD_ACCESS_DENIED');
  }
};

/**
 * Build filter object from query params with ownership visibility.
 */
const buildFilter = (query, user) => {
  const filter = {};

  // Text search
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  // Status filter
  if (query.status) {
    filter.status = query.status;
  }

  // Assigned-to filter
  if (query.assignedTo) {
    filter.assignedTo = query.assignedTo;
  }

  // Source filter
  if (query.source) {
    filter.source = query.source;
  }

  // Tags filter (comma-separated)
  if (query.tags) {
    const tags = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) {
      filter.tags = { $in: tags };
    }
  }

  // Date range filter
  if (query.createdAtFrom || query.createdAtTo) {
    filter.createdAt = {};
    if (query.createdAtFrom) {
      filter.createdAt.$gte = new Date(query.createdAtFrom);
    }
    if (query.createdAtTo) {
      filter.createdAt.$lte = new Date(query.createdAtTo);
    }
  }

  // Ownership visibility: sales users only see their own leads
  // unless they have elevated privileges
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
 * Create a new lead.
 * createdBy is always derived from the authenticated user.
 */
export const createLead = async (data, user) => {
  // If assigning on creation, validate target user
  if (data.assignedTo) {
    const assignee = await User.findById(data.assignedTo);
    if (!assignee) {
      throw new AppError('Assigned user not found', 400, 'INVALID_ASSIGNMENT');
    }
    if (!assignee.isActive) {
      throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
    }
  }

  const lead = await Lead.create({
    ...data,
    createdBy: user._id,
    status: 'new',
  });

  logger.info(`Lead created: ${lead.name} by ${user.email}`);
  return lead;
};

/**
 * List leads with search, filters, and pagination.
 */
export const getLeads = async (query, user) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user);

  // Build sort
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // If text search, sort by text score
  if (query.search) {
    sort.score = { $meta: 'textScore' };
  }

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return {
    leads,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single lead by ID.
 */
export const getLeadById = async (id, user) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .lean();

  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  return lead;
};

/**
 * Update a lead.
 */
export const updateLead = async (id, updates, user) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  assertLeadAccess(lead, user);

  // Prevent changing createdBy or convertedToOpportunity through generic update
  delete updates.createdBy;
  delete updates.convertedToOpportunity;
  delete updates.status; // Status must go through dedicated endpoints

  Object.assign(lead, updates);
  await lead.save();

  logger.info(`Lead updated: ${lead.name} by ${user.email}`);
  return lead;
};

/**
 * Delete a lead (admin/management only).
 */
export const deleteLead = async (id, user) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  // Only admin and management can delete
  const roleName = user.role?.name;
  if (!PRIVILEGED_ROLES.includes(roleName)) {
    throw new AppError('Only admin or management can delete leads', 403, 'LEAD_ACCESS_DENIED');
  }

  await Lead.findByIdAndDelete(id);
  logger.info(`Lead deleted: ${lead.name} by ${user.email}`);
};

// ─── Business Actions ────────────────────────────────────────────────────────

/**
 * Assign a lead to a user.
 * Validates: target user exists, is active, caller has permission.
 */
export const assignLead = async (id, assignedToId, user) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  assertLeadAccess(lead, user);

  // Validate target user
  const assignee = await User.findById(assignedToId);
  if (!assignee) {
    throw new AppError('Assigned user not found', 400, 'INVALID_ASSIGNMENT');
  }
  if (!assignee.isActive) {
    throw new AppError('Cannot assign to inactive user', 400, 'INVALID_ASSIGNMENT');
  }

  const previousAssignee = lead.assignedTo;
  lead.assignedTo = assignedToId;
  await lead.save();

  logger.info(`Lead assigned: ${lead.name} → ${assignee.email} by ${user.email}`);

  return {
    lead,
    previousAssignee,
    assignedTo: assignee,
  };
};

/**
 * Update lead status with transition validation.
 */
export const updateLeadStatus = async (id, newStatus, user) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  assertLeadAccess(lead, user);

  // Validate transition
  if (!Lead.isValidTransition(lead.status, newStatus)) {
    throw new AppError(
      `Cannot transition from "${lead.status}" to "${newStatus}"`,
      400,
      'INVALID_LEAD_STATUS_TRANSITION',
      { currentStatus: lead.status, requestedStatus: newStatus },
    );
  }

  const previousStatus = lead.status;
  lead.status = newStatus;
  await lead.save();

  logger.info(`Lead status: ${lead.name} ${previousStatus} → ${newStatus} by ${user.email}`);

  return { lead, previousStatus };
};

/**
 * Qualify a lead — changes status to 'qualified'.
 */
export const qualifyLead = async (id, user) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  assertLeadAccess(lead, user);

  // Must be in 'contacted' status to qualify
  if (!Lead.isValidTransition(lead.status, 'qualified')) {
    throw new AppError(
      `Cannot qualify a lead with status "${lead.status}". Lead must be in "contacted" status.`,
      400,
      'INVALID_LEAD_STATUS_TRANSITION',
      { currentStatus: lead.status, requiredStatus: 'contacted' },
    );
  }

  lead.status = 'qualified';
  await lead.save();

  logger.info(`Lead qualified: ${lead.name} by ${user.email}`);

  // Return lead with activity metadata for the caller to create an activity
  return { lead, action: 'qualified' };
};

/**
 * Convert a lead — marks as converted and stores opportunity reference.
 * This is an interface for Phase 3 — the Opportunity module.
 */
export const convertLead = async (id, user) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
  }

  assertLeadAccess(lead, user);

  // Must not already be converted
  if (lead.status === 'converted' || lead.convertedToOpportunity) {
    throw new AppError('Lead is already converted', 400, 'LEAD_ALREADY_CONVERTED');
  }

  // Must be qualified
  if (!Lead.isValidTransition(lead.status, 'converted')) {
    throw new AppError(
      `Cannot convert a lead with status "${lead.status}". Lead must be "qualified".`,
      400,
      'INVALID_LEAD_STATUS_TRANSITION',
      { currentStatus: lead.status, requiredStatus: 'qualified' },
    );
  }

  // Create Opportunity from lead
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

  lead.status = 'converted';
  lead.convertedToOpportunity = opportunity._id;
  await lead.save();

  logger.info(`Lead converted: ${lead.name} → Opportunity: ${opportunity.title} by ${user.email}`);

  return {
    lead,
    opportunity,
    action: 'converted',
  };
};

export default {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLead,
  updateLeadStatus,
  qualifyLead,
  convertLead,
};
