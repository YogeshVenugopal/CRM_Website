import { Router } from 'express';
import * as projectController from './project.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createProjectSchema,
  updateProjectSchema,
  projectStatusSchema,
  assignManagerSchema,
  assignTeamSchema,
  projectQuerySchema,
} from './project.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/projects
router.get(
  '/',
  requirePermission('project:read'),
  validate(projectQuerySchema, 'query'),
  paginate,
  asyncWrapper(projectController.getProjects),
);

// POST /api/v1/projects
router.post(
  '/',
  requirePermission('project:create'),
  validate(createProjectSchema),
  asyncWrapper(projectController.createProject),
);

// GET /api/v1/projects/:id
router.get(
  '/:id',
  requirePermission('project:read'),
  asyncWrapper(projectController.getProjectById),
);

// PATCH /api/v1/projects/:id
router.patch(
  '/:id',
  requirePermission('project:update'),
  validate(updateProjectSchema),
  asyncWrapper(projectController.updateProject),
);

// DELETE /api/v1/projects/:id
router.delete(
  '/:id',
  requirePermission('project:delete'),
  asyncWrapper(projectController.deleteProject),
);

// PATCH /api/v1/projects/:id/status
router.patch(
  '/:id/status',
  requirePermission('project:update'),
  validate(projectStatusSchema),
  asyncWrapper(projectController.changeStatus),
);

// PATCH /api/v1/projects/:id/manager
router.patch(
  '/:id/manager',
  requirePermission('project:update'),
  validate(assignManagerSchema),
  asyncWrapper(projectController.assignManager),
);

// PATCH /api/v1/projects/:id/team
router.patch(
  '/:id/team',
  requirePermission('project:update'),
  validate(assignTeamSchema),
  asyncWrapper(projectController.assignTeam),
);

// GET /api/v1/projects/:id/tasks
router.get(
  '/:id/tasks',
  requirePermission('task:read'),
  paginate,
  asyncWrapper(projectController.getProjectTasks),
);

// GET /api/v1/projects/:id/activities
router.get(
  '/:id/activities',
  requirePermission('activity:read'),
  asyncWrapper(projectController.getProjectActivities),
);

export default router;
