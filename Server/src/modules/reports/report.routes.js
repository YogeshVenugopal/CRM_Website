import { Router } from 'express';
import * as reportController from './report.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/reports/sales-pipeline
router.get(
  '/sales-pipeline',
  requirePermission('report:read'),
  asyncWrapper(reportController.getSalesPipelineReport),
);

// GET /api/v1/reports/finance-overview
router.get(
  '/finance-overview',
  requirePermission('report:read'),
  asyncWrapper(reportController.getFinanceOverviewReport),
);

// GET /api/v1/reports/project-status
router.get(
  '/project-status',
  requirePermission('report:read'),
  asyncWrapper(reportController.getProjectStatusReport),
);

export default router;
