import { Router } from 'express';
import * as leadController from './lead.controller.js';
import * as activityController from '../activities/activity.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  statusUpdateSchema,
  leadQuerySchema,
} from './lead.validation.js';

const router = Router();

// All lead routes require authentication
router.use(authenticate);

// GET /api/v1/leads
router.get(
  '/',
  requirePermission('lead:read'),
  validate(leadQuerySchema, 'query'),
  paginate,
  asyncWrapper(leadController.getLeads),
);

// POST /api/v1/leads
router.post(
  '/',
  requirePermission('lead:create'),
  validate(createLeadSchema),
  asyncWrapper(leadController.createLead),
);

// GET /api/v1/leads/:id
router.get(
  '/:id',
  requirePermission('lead:read'),
  asyncWrapper(leadController.getLeadById),
);

// PATCH /api/v1/leads/:id
router.patch(
  '/:id',
  requirePermission('lead:update'),
  validate(updateLeadSchema),
  asyncWrapper(leadController.updateLead),
);

// DELETE /api/v1/leads/:id
router.delete(
  '/:id',
  requirePermission('lead:delete'),
  asyncWrapper(leadController.deleteLead),
);

// PATCH /api/v1/leads/:id/assign
router.patch(
  '/:id/assign',
  requirePermission('lead:update'),
  validate(assignLeadSchema),
  asyncWrapper(leadController.assignLead),
);

// PATCH /api/v1/leads/:id/status
router.patch(
  '/:id/status',
  requirePermission('lead:update'),
  validate(statusUpdateSchema),
  asyncWrapper(leadController.updateLeadStatus),
);

// PATCH /api/v1/leads/:id/qualify
router.patch(
  '/:id/qualify',
  requirePermission('lead:update'),
  asyncWrapper(leadController.qualifyLead),
);

// PATCH /api/v1/leads/:id/convert
router.patch(
  '/:id/convert',
  requirePermission('lead:update'),
  asyncWrapper(leadController.convertLead),
);

// GET /api/v1/leads/:id/activities — convenience endpoint for lead timeline
router.get(
  '/:id/activities',
  requirePermission('activity:read'),
  asyncWrapper(activityController.getLeadActivities),
);

export default router;
