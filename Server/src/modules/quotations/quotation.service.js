import mongoose from 'mongoose';
import Quotation from './quotation.model.js';
import Opportunity from '../pipeline/opportunity.model.js';
import Client from '../clients/client.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate line item and quotation totals.
 * Backend is the source of truth — never trust frontend calculations.
 * Uses Math.round to avoid floating-point precision issues.
 */
export const calculateQuotationTotals = (items) => {
  let subtotal = 0;
  let tax = 0;

  for (const item of items) {
    const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    const lineTax = Math.round(lineTotal * (item.taxPercent / 100) * 100) / 100;
    subtotal += lineTotal;
    tax += lineTax;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  tax = Math.round(tax * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return { subtotal, tax, total };
};

/**
 * Generate a unique quotation number.
 * Format: QT-YYYY-NNNN (safe under concurrency via atomic counter).
 */
const generateQuotationNumber = async (session) => {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  // Use MongoDB's findOneAndUpdate with upsert for atomic counter
  const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: 'quotationNumber' },
    {
      $inc: { seq: 1 },
      $setOnInsert: { _id: 'quotationNumber', seq: 1 },
    },
    { upsert: true, returnDocument: 'after', session },
  );

  const seq = counter?.seq || 1;
  const num = String(seq).padStart(4, '0');
  return `${prefix}${num}`;
};

/**
 * Service-level ownership check for quotations.
 * Checks via the parent Opportunity's assignment/creator.
 */
const assertQuotationAccess = async (quotation, user) => {
  const roleName = user.role?.name;
  if (PRIVILEGED_ROLES.includes(roleName)) return true;

  // Check direct ownership
  if (quotation.createdBy?.toString() === user._id?.toString()) return true;

  // Check via opportunity ownership
  if (quotation.opportunity) {
    const opp = await Opportunity.findById(quotation.opportunity).lean();
    if (opp) {
      if (opp.assignedTo?.toString() === user._id?.toString()) return true;
      if (opp.createdBy?.toString() === user._id?.toString()) return true;
    }
  }

  throw new AppError('You do not have access to this quotation', 403, 'QUOTATION_ACCESS_DENIED');
};

/**
 * Assert quotation is mutable (not accepted/rejected/expired).
 */
const assertMutable = (quotation) => {
  if (['accepted', 'rejected', 'expired'].includes(quotation.status)) {
    throw new AppError(
      `Cannot modify a ${quotation.status} quotation`,
      400,
      'QUOTATION_IMMUTABLE',
      { status: quotation.status },
    );
  }
};

/**
 * Build filter with ownership visibility.
 */
const buildFilter = (query, user) => {
  const filter = {};

  if (query.search) {
    filter.quotationNumber = { $regex: query.search, $options: 'i' };
  }

  if (query.status) filter.status = query.status;
  if (query.opportunity) filter.opportunity = query.opportunity;
  if (query.client) filter.client = query.client;
  if (query.createdBy) filter.createdBy = query.createdBy;

  if (query.validUntilFrom || query.validUntilTo) {
    filter.validUntil = {};
    if (query.validUntilFrom) filter.validUntil.$gte = new Date(query.validUntilFrom);
    if (query.validUntilTo) filter.validUntil.$lte = new Date(query.validUntilTo);
  }

  // Ownership visibility: sales users only see quotations for their opportunities
  const roleName = user.role?.name;
  if (roleName === 'sales') {
    filter.createdBy = user._id;
  }

  return filter;
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new quotation with server-calculated totals.
 */
export const createQuotation = async (data, user) => {
  // Validate opportunity exists
  const opportunity = await Opportunity.findById(data.opportunity);
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'INVALID_OPPORTUNITY');
  }

  // Validate user can access opportunity
  const oppAccess = assertOwnershipOrPrivileged(null, user, PRIVILEGED_ROLES)
    || opportunity.assignedTo?.toString() === user._id?.toString()
    || opportunity.createdBy?.toString() === user._id?.toString();

  if (!oppAccess) {
    throw new AppError('You do not have access to this opportunity', 403, 'QUOTATION_ACCESS_DENIED');
  }

  // Validate client exists if provided
  if (data.client) {
    const client = await Client.findById(data.client);
    if (!client) {
      throw new AppError('Client not found', 404, 'INVALID_CLIENT');
    }

    // Validate client-opportunity relationship consistency
    if (opportunity.client && opportunity.client.toString() !== data.client) {
      throw new AppError(
        'Client does not match the opportunity client',
        400,
        'OPPORTUNITY_CLIENT_MISMATCH',
      );
    }
  }

  // Calculate totals server-side
  const { subtotal, tax, total } = calculateQuotationTotals(data.items);

  // Generate quotation number atomically
  const session = await mongoose.startSession();
  let quotation;

  try {
    await session.withTransaction(async () => {
      const quotationNumber = await generateQuotationNumber(session);

      const [result] = await Quotation.create(
        [{
          quotationNumber,
          opportunity: data.opportunity,
          client: data.client || opportunity.client,
          createdBy: user._id,
          items: data.items,
          subtotal,
          tax,
          total,
          currency: data.currency || opportunity.currency || 'INR',
          status: 'draft',
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          notes: data.notes,
          termsAndConditions: data.termsAndConditions,
        }],
        { session },
      );

      quotation = result;
    });
  } finally {
    session.endSession();
  }

  logger.info(`Quotation created: ${quotation.quotationNumber} by ${user.email}`);
  return quotation;
};

/**
 * List quotations with search, filters, and pagination.
 */
export const getQuotations = async (query, user) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user);

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  const [quotations, total] = await Promise.all([
    Quotation.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('opportunity', 'title stage')
      .populate('client', 'companyName')
      .populate('createdBy', 'name email')
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  return {
    quotations,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single quotation by ID.
 */
export const getQuotationById = async (id, user) => {
  const quotation = await Quotation.findById(id)
    .populate('opportunity', 'title stage value currency')
    .populate('client', 'companyName primaryContact')
    .populate('createdBy', 'name email')
    .populate('parentQuotation', 'quotationNumber version')
    .lean();

  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  return quotation;
};

/**
 * Update a quotation (only draft quotations can be updated).
 */
export const updateQuotation = async (id, updates, user) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  await assertQuotationAccess(quotation, user);
  assertMutable(quotation);

  // Prevent changing critical fields
  delete updates.quotationNumber;
  delete updates.version;
  delete updates.parentQuotation;
  delete updates.createdBy;
  delete updates.status;
  delete updates.sentAt;
  delete updates.acceptedAt;
  delete updates.rejectedAt;
  delete updates.rejectionReason;

  // If items changed, recalculate totals
  if (updates.items) {
    const { subtotal, tax, total } = calculateQuotationTotals(updates.items);
    updates.subtotal = subtotal;
    updates.tax = tax;
    updates.total = total;
  }

  Object.assign(quotation, updates);
  await quotation.save();

  logger.info(`Quotation updated: ${quotation.quotationNumber} by ${user.email}`);
  return quotation;
};

/**
 * Delete a quotation (admin/management only, draft only).
 */
export const deleteQuotation = async (id, user) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  const roleName = user.role?.name;
  if (!PRIVILEGED_ROLES.includes(roleName)) {
    throw new AppError('Only admin or management can delete quotations', 403, 'QUOTATION_ACCESS_DENIED');
  }

  if (quotation.status !== 'draft') {
    throw new AppError('Only draft quotations can be deleted', 400, 'QUOTATION_IMMUTABLE');
  }

  await Quotation.findByIdAndDelete(id);
  logger.info(`Quotation deleted: ${quotation.quotationNumber} by ${user.email}`);
};

// ─── Business Actions ────────────────────────────────────────────────────────

/**
 * Send a quotation.
 */
export const sendQuotation = async (id, user) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  await assertQuotationAccess(quotation, user);

  if (!Quotation.isValidTransition(quotation.status, 'sent')) {
    throw new AppError(
      `Cannot send a quotation with status "${quotation.status}"`,
      400,
      'INVALID_QUOTATION_TRANSITION',
      { currentStatus: quotation.status, requestedStatus: 'sent' },
    );
  }

  // Validate preconditions
  if (!quotation.items || quotation.items.length === 0) {
    throw new AppError('Quotation must have at least one item', 400, 'QUOTATION_ITEMS_REQUIRED');
  }

  if (quotation.total <= 0) {
    throw new AppError('Quotation total must be greater than 0', 400, 'INVALID_QUOTATION_TOTAL');
  }

  if (!quotation.validUntil) {
    throw new AppError('Valid until date is required', 400, 'VALID_UNTIL_REQUIRED');
  }

  if (new Date(quotation.validUntil) <= new Date()) {
    throw new AppError('Valid until date must be in the future', 400, 'VALID_UNTIL_PAST');
  }

  quotation.status = 'sent';
  quotation.sentAt = new Date();
  await quotation.save();

  logger.info(`Quotation sent: ${quotation.quotationNumber} by ${user.email}`);
  return quotation;
};

/**
 * Accept a quotation.
 */
export const acceptQuotation = async (id, user) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  await assertQuotationAccess(quotation, user);

  if (!Quotation.isValidTransition(quotation.status, 'accepted')) {
    throw new AppError(
      `Cannot accept a quotation with status "${quotation.status}"`,
      400,
      'INVALID_QUOTATION_TRANSITION',
      { currentStatus: quotation.status },
    );
  }

  // Check expiration
  if (quotation.validUntil && new Date(quotation.validUntil) < new Date()) {
    quotation.status = 'expired';
    await quotation.save();
    throw new AppError('Quotation has expired', 400, 'QUOTATION_EXPIRED');
  }

  quotation.status = 'accepted';
  quotation.acceptedAt = new Date();
  await quotation.save();

  logger.info(`Quotation accepted: ${quotation.quotationNumber} by ${user.email}`);
  return quotation;
};

/**
 * Reject a quotation.
 */
export const rejectQuotation = async (id, reason, user) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  await assertQuotationAccess(quotation, user);

  if (!Quotation.isValidTransition(quotation.status, 'rejected')) {
    throw new AppError(
      `Cannot reject a quotation with status "${quotation.status}"`,
      400,
      'INVALID_QUOTATION_TRANSITION',
      { currentStatus: quotation.status },
    );
  }

  quotation.status = 'rejected';
  quotation.rejectedAt = new Date();
  quotation.rejectionReason = reason;
  await quotation.save();

  logger.info(`Quotation rejected: ${quotation.quotationNumber} — ${reason} by ${user.email}`);
  return quotation;
};

/**
 * Expire a quotation.
 */
export const expireQuotation = async (id, user) => {
  const quotation = await Quotation.findById(id);
  if (!quotation) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  await assertQuotationAccess(quotation, user);

  if (!Quotation.isValidTransition(quotation.status, 'expired')) {
    throw new AppError(
      `Cannot expire a quotation with status "${quotation.status}"`,
      400,
      'INVALID_QUOTATION_TRANSITION',
      { currentStatus: quotation.status },
    );
  }

  quotation.status = 'expired';
  await quotation.save();

  logger.info(`Quotation expired: ${quotation.quotationNumber} by ${user.email}`);
  return quotation;
};

/**
 * Create a new version of a quotation.
 * Preserves the original and creates a new draft with incremented version.
 */
export const createVersion = async (id, user) => {
  const original = await Quotation.findById(id);
  if (!original) {
    throw new AppError('Quotation not found', 404, 'QUOTATION_NOT_FOUND');
  }

  await assertQuotationAccess(original, user);

  // Only draft or rejected quotations can be versioned
  if (!['draft', 'rejected'].includes(original.status)) {
    throw new AppError(
      `Cannot create version from a "${original.status}" quotation`,
      400,
      'QUOTATION_VERSION_INVALID',
      { status: original.status },
    );
  }

  // Generate new quotation number
  const session = await mongoose.startSession();
  let newQuotation;

  try {
    await session.withTransaction(async () => {
      const quotationNumber = await generateQuotationNumber(session);

      const [result] = await Quotation.create(
        [{
          quotationNumber,
          version: original.version + 1,
          parentQuotation: original._id,
          opportunity: original.opportunity,
          client: original.client,
          createdBy: user._id,
          items: original.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxPercent: item.taxPercent,
          })),
          subtotal: original.subtotal,
          tax: original.tax,
          total: original.total,
          currency: original.currency,
          status: 'draft',
          validUntil: original.validUntil,
          notes: original.notes,
          termsAndConditions: original.termsAndConditions,
        }],
        { session },
      );

      newQuotation = result;
    });
  } finally {
    session.endSession();
  }

  logger.info(`Quotation version created: ${original.quotationNumber} v${original.version} → ${newQuotation.quotationNumber} v${newQuotation.version} by ${user.email}`);
  return newQuotation;
};

/**
 * Get quotations for an opportunity.
 */
export const getQuotationsByOpportunity = async (opportunityId, user) => {
  const opportunity = await Opportunity.findById(opportunityId).lean();
  if (!opportunity) {
    throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
  }

  const quotations = await Quotation.find({ opportunity: opportunityId })
    .sort({ createdAt: -1 })
    .populate('client', 'companyName')
    .populate('createdBy', 'name email')
    .lean();

  return quotations;
};

/**
 * Get the latest accepted quotation for an opportunity.
 * Used by markWon() to validate the quotation.
 */
export const getAcceptedQuotation = async (opportunityId) => {
  return Quotation.findOne({
    opportunity: opportunityId,
    status: 'accepted',
  })
    .sort({ createdAt: -1 })
    .lean();
};

export default {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
  expireQuotation,
  createVersion,
  getQuotationsByOpportunity,
  getAcceptedQuotation,
  calculateQuotationTotals,
};
