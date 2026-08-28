import * as reportService from './report.service.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';

export const getSalesPipelineReport = async (req, res) => {
  const report = await reportService.getSalesPipelineReport(req.user);
  return sendSuccess(res, { data: report });
};

export const getFinanceOverviewReport = async (req, res) => {
  const report = await reportService.getFinanceOverviewReport(req.user);
  return sendSuccess(res, { data: report });
};

export const getProjectStatusReport = async (req, res) => {
  const report = await reportService.getProjectStatusReport(req.user);
  return sendSuccess(res, { data: report });
};

export default {
  getSalesPipelineReport,
  getFinanceOverviewReport,
  getProjectStatusReport,
};
