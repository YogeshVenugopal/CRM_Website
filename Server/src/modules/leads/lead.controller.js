import * as leadService from './lead.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

/**
 * POST /api/v1/leads
 */
export const createLead = async (req, res) => {
  const lead = await leadService.createLead(req.body, req.user);

  return sendSuccess(res, { data: lead, statusCode: 201 });
};

/**
 * GET /api/v1/leads
 */
export const getLeads = async (req, res) => {
  const result = await leadService.getLeads(
    {
      ...req.query,
      page: req.pagination?.page || req.query.page,
      limit: req.pagination?.limit || req.query.limit,
    },
    req.user,
  );

  return sendSuccess(res, { data: result.leads, meta: result.meta });
};

/**
 * GET /api/v1/leads/:id
 */
export const getLeadById = async (req, res) => {
  const lead = await leadService.getLeadById(req.params.id, req.user);

  return sendSuccess(res, { data: lead });
};

/**
 * PATCH /api/v1/leads/:id
 */
export const updateLead = async (req, res) => {
  const lead = await leadService.updateLead(req.params.id, req.body, req.user);

  return sendSuccess(res, { data: lead });
};

/**
 * DELETE /api/v1/leads/:id
 */
export const deleteLead = async (req, res) => {
  await leadService.deleteLead(req.params.id, req.user);

  return sendSuccess(res, { data: { message: 'Lead deleted successfully' } });
};

/**
 * PATCH /api/v1/leads/:id/assign
 */
export const assignLead = async (req, res) => {
  const result = await leadService.assignLead(req.params.id, req.body.assignedTo, req.user);

  return sendSuccess(res, { data: result });
};

/**
 * PATCH /api/v1/leads/:id/status
 */
export const updateLeadStatus = async (req, res) => {
  const result = await leadService.updateLeadStatus(req.params.id, req.body.status, req.user);

  return sendSuccess(res, { data: result });
};

/**
 * PATCH /api/v1/leads/:id/qualify
 */
export const qualifyLead = async (req, res) => {
  const result = await leadService.qualifyLead(req.params.id, req.user);

  return sendSuccess(res, { data: result });
};

/**
 * PATCH /api/v1/leads/:id/convert
 */
export const convertLead = async (req, res) => {
  const result = await leadService.convertLead(req.params.id, req.user);

  return sendSuccess(res, { data: result });
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
