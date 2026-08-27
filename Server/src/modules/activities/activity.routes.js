import { Router } from 'express';
import * as activityController from './activity.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createActivitySchema,
  updateActivitySchema,
  activityQuerySchema,
} from './activity.validation.js';

const router = Router();

// All activity routes require authentication
router.use(authenticate);

// GET /api/v1/activities/follow-ups — pending follow-ups for current user
router.get(
  '/follow-ups',
  requirePermission('activity:read'),
  asyncWrapper(activityController.getPendingFollowUps),
);

// GET /api/v1/activities — list with cursor pagination and filters
router.get(
  '/',
  requirePermission('activity:read'),
  validate(activityQuerySchema, 'query'),
  asyncWrapper(activityController.getActivities),
);

// POST /api/v1/activities
router.post(
  '/',
  requirePermission('activity:create'),
  validate(createActivitySchema),
  asyncWrapper(activityController.createActivity),
);

// GET /api/v1/activities/:id
router.get(
  '/:id',
  requirePermission('activity:read'),
  asyncWrapper(activityController.getActivityById),
);

// PATCH /api/v1/activities/:id
router.patch(
  '/:id',
  requirePermission('activity:update'),
  validate(updateActivitySchema),
  asyncWrapper(activityController.updateActivity),
);

// DELETE /api/v1/activities/:id
// No route-level permission check — service handles ownership authorization
router.delete(
  '/:id',
  asyncWrapper(activityController.deleteActivity),
);

// PATCH /api/v1/activities/:id/complete
router.patch(
  '/:id/complete',
  requirePermission('activity:update'),
  asyncWrapper(activityController.completeActivity),
);

export default router;
