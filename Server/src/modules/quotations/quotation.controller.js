import * as quotationService from './quotation.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const createQuotation = async (req, res) => {
  const quotation = await quotationService.createQuotation(req.body, req.user);
  return sendSuccess(res, { data: quotation, statusCode: 201 });
};

export const getQuotations = async (req, res) => {
  const result = await quotationService.getQuotations(
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
  );
  return sendSuccess(res, { data: result.quotations, meta: result.meta });
};

export const getQuotationById = async (req, res) => {
  const quotation = await quotationService.getQuotationById(req.params.id, req.user);
  return sendSuccess(res, { data: quotation });
};

export const updateQuotation = async (req, res) => {
  const quotation = await quotationService.updateQuotation(req.params.id, req.body, req.user);
  return sendSuccess(res, { data: quotation });
};

export const deleteQuotation = async (req, res) => {
  await quotationService.deleteQuotation(req.params.id, req.user);
  return sendSuccess(res, { data: { message: 'Quotation deleted successfully' } });
};

export const sendQuotation = async (req, res) => {
  const quotation = await quotationService.sendQuotation(req.params.id, req.user);
  return sendSuccess(res, { data: quotation });
};

export const acceptQuotation = async (req, res) => {
  const quotation = await quotationService.acceptQuotation(req.params.id, req.user);
  return sendSuccess(res, { data: quotation });
};

export const rejectQuotation = async (req, res) => {
  const quotation = await quotationService.rejectQuotation(req.params.id, req.body.reason, req.user);
  return sendSuccess(res, { data: quotation });
};

export const expireQuotation = async (req, res) => {
  const quotation = await quotationService.expireQuotation(req.params.id, req.user);
  return sendSuccess(res, { data: quotation });
};

export const createVersion = async (req, res) => {
  const quotation = await quotationService.createVersion(req.params.id, req.user);
  return sendSuccess(res, { data: quotation, statusCode: 201 });
};

export const getQuotationsByOpportunity = async (req, res) => {
  const quotations = await quotationService.getQuotationsByOpportunity(req.params.id, req.user);
  return sendSuccess(res, { data: quotations });
};

export const getQuotationPdf = async (req, res) => {
  // PDF generation boundary — returns placeholder for Phase 5 integration
  const quotation = await quotationService.getQuotationById(req.params.id, req.user);
  return sendSuccess(res, {
    data: {
      message: 'PDF generation will be implemented with BullMQ worker',
      quotationNumber: quotation.quotationNumber,
      total: quotation.total,
      currency: quotation.currency,
    },
  });
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
  getQuotationPdf,
};
