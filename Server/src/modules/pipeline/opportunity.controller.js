import * as opportunityService from './opportunity.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const createOpportunity = async (req, res) => {
  const opportunity = await opportunityService.createOpportunity(req.body, req.user);
  return sendSuccess(res, { data: opportunity, statusCode: 201 });
};

export const getOpportunities = async (req, res) => {
  const result = await opportunityService.getOpportunities(
    { ...req.query, page: req.pagination?.page, limit: req.pagination?.limit },
    req.user,
  );
  return sendSuccess(res, { data: result.opportunities, meta: result.meta });
};

export const getOpportunityById = async (req, res) => {
  const opportunity = await opportunityService.getOpportunityById(req.params.id, req.user);
  return sendSuccess(res, { data: opportunity });
};

export const updateOpportunity = async (req, res) => {
  const opportunity = await opportunityService.updateOpportunity(req.params.id, req.body, req.user);
  return sendSuccess(res, { data: opportunity });
};

export const deleteOpportunity = async (req, res) => {
  await opportunityService.deleteOpportunity(req.params.id, req.user);
  return sendSuccess(res, { data: { message: 'Opportunity deleted successfully' } });
};

export const assignOpportunity = async (req, res) => {
  const result = await opportunityService.assignOpportunity(req.params.id, req.body.assignedTo, req.user);
  return sendSuccess(res, { data: result });
};

export const changeStage = async (req, res) => {
  const result = await opportunityService.changeStage(req.params.id, req.body.stage, req.user);
  return sendSuccess(res, { data: result });
};

export const markLost = async (req, res) => {
  const opportunity = await opportunityService.markLost(req.params.id, req.body.reason, req.user);
  return sendSuccess(res, { data: opportunity });
};

export const markWon = async (req, res) => {
  const result = await opportunityService.markWon(req.params.id, req.user, req.body.quotationId);
  return sendSuccess(res, { data: result });
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
};
