import mongoose from 'mongoose';
import Opportunity from '../pipeline/opportunity.model.js';
import Invoice from '../finance/invoice.model.js';
import Project from '../projects/project.model.js';
import Task from '../tasks/task.model.js';
import Lead from '../leads/lead.model.js';
import AppError from '../../core/utils/AppError.js';
import logger from '../../core/utils/logger.js';

const CACHE_TTL = 300; // 5 minutes

/**
 * Get or set cache (Redis optional — gracefully degrade).
 */
const getCached = async (key, fetchFn) => {
  // In test or without Redis, just fetch directly
  return fetchFn();
};

/**
 * Sales Pipeline Report
 * GET /api/v1/reports/sales-pipeline
 */
export const getSalesPipelineReport = async (user) => {
  return getCached(`report:pipeline:${user._id}`, async () => {
    const matchFilter = {};

    // Role-based filtering
    const roleName = user.role?.name;
    if (roleName === 'sales') {
      matchFilter.$or = [
        { assignedTo: user._id },
        { createdBy: user._id },
      ];
    }

    // Pipeline by stage
    const stageAggregation = await Opportunity.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          avgProbability: { $avg: '$probability' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Overall metrics
    const overall = await Opportunity.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOpportunities: { $sum: 1 },
          totalValue: { $sum: '$value' },
          weightedValue: {
            $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] },
          },
          wonValue: {
            $sum: { $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] },
          },
          lostValue: {
            $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, '$value', 0] },
          },
          wonCount: {
            $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] },
          },
          lostCount: {
            $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, 1, 0] },
          },
        },
      },
    ]);

    // Lead conversion stats
    const leadStats = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = leadStats.reduce((sum, l) => sum + l.count, 0);
    const convertedLeads = leadStats.find((l) => l._id === 'converted')?.count || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      pipeline: stageAggregation,
      overall: overall[0] || {
        totalOpportunities: 0,
        totalValue: 0,
        weightedValue: 0,
        wonValue: 0,
        lostValue: 0,
        wonCount: 0,
        lostCount: 0,
      },
      leadConversion: {
        totalLeads,
        convertedLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
    };
  });
};

/**
 * Finance Overview Report
 * GET /api/v1/reports/finance-overview
 */
export const getFinanceOverviewReport = async (user) => {
  return getCached(`report:finance:${user._id}`, async () => {
    const matchFilter = {};

    const roleName = user.role?.name;
    if (roleName === 'sales') {
      matchFilter.createdBy = user._id;
    }

    // Invoice status breakdown
    const invoiceStatus = await Invoice.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountDue' },
          totalPaid: { $sum: '$amountPaid' },
        },
      },
    ]);

    // Overall financial metrics
    const overall = await Invoice.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$amountDue' },
          totalPaid: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: '$balance' },
          totalInvoices: { $sum: 1 },
          overdueCount: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] },
          },
          overdueAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, '$balance', 0] },
          },
        },
      },
    ]);

    return {
      byStatus: invoiceStatus,
      overall: overall[0] || {
        totalInvoiced: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        totalInvoices: 0,
        overdueCount: 0,
        overdueAmount: 0,
      },
    };
  });
};

/**
 * Project Status Report
 * GET /api/v1/reports/project-status
 */
export const getProjectStatusReport = async (user) => {
  return getCached(`report:projects:${user._id}`, async () => {
    const matchFilter = {};

    const roleName = user.role?.name;
    if (roleName === 'project_manager') {
      matchFilter.manager = user._id;
    } else if (roleName === 'employee') {
      matchFilter.$or = [
        { manager: user._id },
        { team: user._id },
      ];
    }

    // Project status breakdown
    const projectStatus = await Project.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Task completion stats for active projects
    const activeProjects = await Project.find(
      { status: { $in: ['planned', 'in_progress'] }, ...matchFilter },
      { _id: 1, name: 1 },
    ).lean();

    const taskStats = [];
    for (const project of activeProjects) {
      const stats = await Task.aggregate([
        { $match: { project: project._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const total = stats.reduce((sum, s) => sum + s.count, 0);
      const done = stats.find((s) => s._id === 'done')?.count || 0;

      taskStats.push({
        project: project.name,
        projectId: project._id,
        totalTasks: total,
        completedTasks: done,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
      });
    }

    // Overall metrics
    const overall = await Project.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          activeProjects: {
            $sum: { $cond: [{ $in: ['$status', ['planned', 'in_progress']] }, 1, 0] },
          },
          completedProjects: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalBudget: { $sum: '$budget' },
        },
      },
    ]);

    return {
      byStatus: projectStatus,
      taskStats,
      overall: overall[0] || {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0,
      },
    };
  });
};

export default {
  getSalesPipelineReport,
  getFinanceOverviewReport,
  getProjectStatusReport,
};
