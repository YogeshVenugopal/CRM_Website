import { Router } from 'express';
import * as opportunityController from './opportunity.controller.js';
import * as quotationController from '../quotations/quotation.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  stageUpdateSchema,
  markLostSchema,
  markWonSchema,
  assignOpportunitySchema,
  opportunityQuerySchema,
} from './opportunity.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/opportunities
router.get(
  '/',
  requirePermission('opportunity:read'),
  validate(opportunityQuerySchema, 'query'),
  paginate,
  asyncWrapper(opportunityController.getOpportunities),
);

// POST /api/v1/opportunities
router.post(
  '/',
  requirePermission('opportunity:create'),
  validate(createOpportunitySchema),
  asyncWrapper(opportunityController.createOpportunity),
);

// GET /api/v1/opportunities/:id
router.get(
  '/:id',
  requirePermission('opportunity:read'),
  asyncWrapper(opportunityController.getOpportunityById),
);

// PATCH /api/v1/opportunities/:id
router.patch(
  '/:id',
  requirePermission('opportunity:update'),
  validate(updateOpportunitySchema),
  asyncWrapper(opportunityController.updateOpportunity),
);

// DELETE /api/v1/opportunities/:id
router.delete(
  '/:id',
  requirePermission('opportunity:delete'),
  asyncWrapper(opportunityController.deleteOpportunity),
);

// PATCH /api/v1/opportunities/:id/assign
router.patch(
  '/:id/assign',
  requirePermission('opportunity:update'),
  validate(assignOpportunitySchema),
  asyncWrapper(opportunityController.assignOpportunity),
);

// PATCH /api/v1/opportunities/:id/stage
router.patch(
  '/:id/stage',
  requirePermission('opportunity:update'),
  validate(stageUpdateSchema),
  asyncWrapper(opportunityController.changeStage),
);

// PATCH /api/v1/opportunities/:id/won
router.patch(
  '/:id/won',
  requirePermission('opportunity:update'),
  validate(markWonSchema),
  asyncWrapper(opportunityController.markWon),
);

// PATCH /api/v1/opportunities/:id/lost
router.patch(
  '/:id/lost',
  requirePermission('opportunity:update'),
  validate(markLostSchema),
  asyncWrapper(opportunityController.markLost),
);

// GET /api/v1/opportunities/:id/quotations — convenience endpoint
router.get(
  '/:id/quotations',
  requirePermission('quotation:read'),
  asyncWrapper(quotationController.getQuotationsByOpportunity),
);

export default router;
