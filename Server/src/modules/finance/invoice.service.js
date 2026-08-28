import mongoose from 'mongoose';
import Invoice from './invoice.model.js';
import Payment from './payment.model.js';
import Client from '../clients/client.model.js';
import Project from '../projects/project.model.js';
import User from '../users/user.model.js';
import AppError from '../../core/utils/AppError.js';
import { assertOwnershipOrPrivileged } from '../../core/middleware/rbac.js';
import logger from '../../core/utils/logger.js';

const PRIVILEGED_ROLES = ['admin', 'management'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate invoice totals from line items.
 * Backend is the source of truth.
 */
export const calculateInvoiceTotals = (items) => {
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

  return { subtotal, tax, amountDue: total };
};

/**
 * Generate a unique invoice number.
 * Format: INV-YYYY-NNNN
 * Uses a safe counter with upsert.
 */
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const counter = await mongoose.connection.collection('counters').findOneAndUpdate(
    { _id: 'invoiceNumber' },
    [{ $set: { seq: { $add: [{ $ifNull: ['$seq', 0] }, 1] } } }],
    { upsert: true, returnDocument: 'after' },
  );

  const seq = counter?.seq || 1;
  const num = String(seq).padStart(4, '0');
  return `${prefix}${num}`;
};

const assertInvoiceAccess = async (invoice, user) => {
  const roleName = user.role?.name;
  if (PRIVILEGED_ROLES.includes(roleName)) return true;
  if (invoice.createdBy?.toString() === user._id?.toString()) return true;

  // Finance role can access invoices
  if (roleName === 'finance') return true;

  throw new AppError('You do not have access to this invoice', 403, 'INVOICE_ACCESS_DENIED');
};

const buildFilter = (query, user) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.client) filter.client = query.client;
  if (query.project) filter.project = query.project;

  const roleName = user.role?.name;
  if (roleName === 'sales') {
    filter.createdBy = user._id;
  }

  return filter;
};

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Create a new invoice.
 */
export const createInvoice = async (data, user) => {
  // Validate client
  const client = await Client.findById(data.client);
  if (!client) {
    throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
  }

  // Validate project if provided
  if (data.project) {
    const project = await Project.findById(data.project);
    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }
  }

  // Calculate totals server-side
  const { subtotal, tax, amountDue } = calculateInvoiceTotals(data.items);

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await Invoice.create({
    invoiceNumber,
    client: data.client,
    project: data.project || null,
    opportunity: data.opportunity || null,
    quotation: data.quotation || null,
    createdBy: user._id,
    items: data.items,
    subtotal,
    tax,
    amountDue,
    amountPaid: 0,
    balance: amountDue,
    currency: data.currency || 'INR',
    status: 'draft',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    notes: data.notes,
  });

  logger.info(`Invoice created: ${invoice.invoiceNumber} by ${user.email}`);
  return invoice;
};

/**
 * Create a draft invoice from handover data.
 * Called during Opportunity Won → Project creation.
 */
export const createDraftFromHandover = async (data) => {
  const { subtotal, tax, amountDue } = calculateInvoiceTotals(data.items);
  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await Invoice.create({
    invoiceNumber,
    client: data.client,
    project: data.project || null,
    opportunity: data.opportunity || null,
    quotation: data.quotation || null,
    createdBy: data.createdBy,
    items: data.items,
    subtotal,
    tax,
    amountDue,
    amountPaid: 0,
    balance: amountDue,
    currency: data.currency || 'INR',
    status: 'draft',
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
  });

  logger.info(`Draft invoice created from handover: ${invoice.invoiceNumber}`);
  return invoice;
};

/**
 * List invoices with filters and pagination.
 */
export const getInvoices = async (query, user) => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const filter = buildFilter(query, user);

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('client', 'companyName')
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  return {
    invoices,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get a single invoice by ID.
 */
export const getInvoiceById = async (id, user) => {
  const invoice = await Invoice.findById(id)
    .populate('client', 'companyName primaryContact')
    .populate('project', 'name')
    .populate('opportunity', 'title')
    .populate('quotation', 'quotationNumber total')
    .populate('createdBy', 'name email')
    .lean();

  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  return invoice;
};

/**
 * Update an invoice (draft only).
 */
export const updateInvoice = async (id, updates, user) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  await assertInvoiceAccess(invoice, user);

  // Only draft invoices can be updated
  if (invoice.status !== 'draft') {
    throw new AppError('Only draft invoices can be updated', 400, 'INVOICE_IMMUTABLE');
  }

  delete updates.invoiceNumber;
  delete updates.items;
  delete updates.subtotal;
  delete updates.tax;
  delete updates.amountDue;
  delete updates.amountPaid;
  delete updates.balance;
  delete updates.status;
  delete updates.createdBy;

  if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

  Object.assign(invoice, updates);
  await invoice.save();

  logger.info(`Invoice updated: ${invoice.invoiceNumber} by ${user.email}`);
  return invoice;
};

// ─── Business Actions ────────────────────────────────────────────────────────

/**
 * Send an invoice.
 */
export const sendInvoice = async (id, user) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  await assertInvoiceAccess(invoice, user);

  if (!Invoice.isValidTransition(invoice.status, 'sent')) {
    throw new AppError(
      `Cannot send invoice with status "${invoice.status}"`,
      400,
      'INVALID_INVOICE_TRANSITION',
      { currentStatus: invoice.status, requestedStatus: 'sent' },
    );
  }

  invoice.status = 'sent';
  invoice.issuedAt = new Date();
  await invoice.save();

  logger.info(`Invoice sent: ${invoice.invoiceNumber} by ${user.email}`);
  return invoice;
};

/**
 * Approve an invoice (finance/admin only).
 */
export const approveInvoice = async (id, user) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const roleName = user.role?.name;
  if (!['admin', 'management', 'finance'].includes(roleName)) {
    throw new AppError('Only finance, admin, or management can approve invoices', 403, 'INVOICE_ACCESS_DENIED');
  }

  if (invoice.status !== 'draft') {
    throw new AppError('Only draft invoices can be approved for sending', 400, 'INVALID_INVOICE_TRANSITION');
  }

  invoice.status = 'sent';
  invoice.issuedAt = new Date();
  await invoice.save();

  logger.info(`Invoice approved: ${invoice.invoiceNumber} by ${user.email}`);
  return invoice;
};

/**
 * Cancel an invoice.
 */
export const cancelInvoice = async (id, user) => {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  await assertInvoiceAccess(invoice, user);

  if (!Invoice.isValidTransition(invoice.status, 'cancelled')) {
    throw new AppError(
      `Cannot cancel invoice with status "${invoice.status}"`,
      400,
      'INVALID_INVOICE_TRANSITION',
      { currentStatus: invoice.status },
    );
  }

  invoice.status = 'cancelled';
  await invoice.save();

  logger.info(`Invoice cancelled: ${invoice.invoiceNumber} by ${user.email}`);
  return invoice;
};

// ─── Payment Operations ──────────────────────────────────────────────────────

/**
 * Record a payment against an invoice.
 * Uses atomic update + optimistic concurrency to prevent overpayments.
 */
export const recordPayment = async (invoiceId, paymentData, user) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  await assertInvoiceAccess(invoice, user);

  // Cannot pay cancelled or draft invoices
  if (['draft', 'cancelled'].includes(invoice.status)) {
    throw new AppError(
      `Cannot record payment for an invoice with status "${invoice.status}"`,
      400,
      'INVALID_INVOICE_TRANSITION',
      { currentStatus: invoice.status },
    );
  }

  // Validate payment amount
  if (paymentData.amount <= 0) {
    throw new AppError('Payment amount must be greater than 0', 400, 'INVALID_PAYMENT_AMOUNT');
  }

  // Check remaining balance using current DB state
  if (paymentData.amount > invoice.balance) {
    throw new AppError(
      'Payment amount exceeds remaining balance',
      400,
      'PAYMENT_EXCEEDS_BALANCE',
      { balance: invoice.balance, amount: paymentData.amount },
    );
  }

  // Use atomic update for concurrency safety
  const newAmountPaid = invoice.amountPaid + paymentData.amount;
  const newBalance = invoice.amountDue - newAmountPaid;

  // Determine new status
  let newStatus;
  if (newBalance <= 0) {
    newStatus = 'paid';
  } else {
    newStatus = 'partially_paid';
  }

  // Atomic update with optimistic concurrency check
  const result = await Invoice.findOneAndUpdate(
    {
      _id: invoiceId,
      amountPaid: invoice.amountPaid, // Optimistic lock
    },
    {
      $set: {
        amountPaid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
        ...(newStatus === 'paid' ? { paidAt: new Date() } : {}),
      },
    },
    { returnDocument: 'after' },
  );

  if (!result) {
    throw new AppError(
      'Payment conflict — another payment may have been processed simultaneously. Please try again.',
      409,
      'PAYMENT_CONFLICT',
    );
  }

  // Create payment record
  const payment = await Payment.create({
    invoice: invoiceId,
    amount: paymentData.amount,
    method: paymentData.method,
    transactionRef: paymentData.transactionRef || null,
    paidAt: paymentData.paidAt ? new Date(paymentData.paidAt) : new Date(),
    recordedBy: user._id,
    notes: paymentData.notes || null,
  });

  logger.info(`Payment recorded: ${paymentData.amount} for ${invoice.invoiceNumber} by ${user.email}`);

  return { payment, invoice: result };
};

/**
 * Get payments for an invoice.
 */
export const getPaymentsByInvoice = async (invoiceId, user) => {
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const payments = await Payment.find({ invoice: invoiceId })
    .sort({ createdAt: -1 })
    .populate('recordedBy', 'name email')
    .lean();

  return payments;
};

/**
 * Get a single payment.
 */
export const getPaymentById = async (id) => {
  const payment = await Payment.findById(id)
    .populate('invoice', 'invoiceNumber amountDue amountPaid')
    .populate('recordedBy', 'name email')
    .lean();

  if (!payment) {
    throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
  }

  return payment;
};

/**
 * Check and mark overdue invoices.
 * Used by background job.
 */
export const markOverdueInvoices = async () => {
  const now = new Date();
  const result = await Invoice.updateMany(
    {
      status: { $in: ['sent', 'partially_paid'] },
      dueDate: { $lt: now },
      balance: { $gt: 0 },
    },
    { $set: { status: 'overdue' } },
  );

  if (result.modifiedCount > 0) {
    logger.info(`Marked ${result.modifiedCount} invoices as overdue`);
  }

  return result.modifiedCount;
};

export default {
  createInvoice,
  createDraftFromHandover,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  sendInvoice,
  approveInvoice,
  cancelInvoice,
  recordPayment,
  getPaymentsByInvoice,
  getPaymentById,
  markOverdueInvoices,
  calculateInvoiceTotals,
};
