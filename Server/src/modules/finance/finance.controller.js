import * as invoiceService from './invoice.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

// ─── Invoice Endpoints ───────────────────────────────────────────────────────

export const createInvoice = async (req, res) => {
  const invoice = await invoiceService.createInvoice(req.body, req.user);
  return sendSuccess(res, { data: invoice, statusCode: 201 });
};

export const getInvoices = async (req, res) => {
  const result = await invoiceService.getInvoices(
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
  );
  return sendSuccess(res, { data: result.invoices, meta: result.meta });
};

export const getInvoiceById = async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(req.params.id, req.user);
  return sendSuccess(res, { data: invoice });
};

export const updateInvoice = async (req, res) => {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body, req.user);
  return sendSuccess(res, { data: invoice });
};

export const sendInvoice = async (req, res) => {
  const invoice = await invoiceService.sendInvoice(req.params.id, req.user);
  return sendSuccess(res, { data: invoice });
};

export const approveInvoice = async (req, res) => {
  const invoice = await invoiceService.approveInvoice(req.params.id, req.user);
  return sendSuccess(res, { data: invoice });
};

export const cancelInvoice = async (req, res) => {
  const invoice = await invoiceService.cancelInvoice(req.params.id, req.user);
  return sendSuccess(res, { data: invoice });
};

// ─── Payment Endpoints ───────────────────────────────────────────────────────

export const recordPayment = async (req, res) => {
  const result = await invoiceService.recordPayment(req.params.invoiceId, req.body, req.user);
  return sendSuccess(res, { data: result, statusCode: 201 });
};

export const getPaymentsByInvoice = async (req, res) => {
  const payments = await invoiceService.getPaymentsByInvoice(req.params.invoiceId, req.user);
  return sendSuccess(res, { data: payments });
};

export const getPaymentById = async (req, res) => {
  const payment = await invoiceService.getPaymentById(req.params.id);
  return sendSuccess(res, { data: payment });
};

export default {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  sendInvoice,
  approveInvoice,
  cancelInvoice,
  recordPayment,
  getPaymentsByInvoice,
  getPaymentById,
};
