import { Router } from 'express';
import * as taskController from './task.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
  assignTaskSchema,
  taskQuerySchema,
} from './task.validation.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/projects/:projectId/tasks
router.post(
  '/project/:projectId',
  requirePermission('task:create'),
  validate(createTaskSchema),
  asyncWrapper(taskController.createTask),
);

// GET /api/v1/projects/:projectId/tasks
router.get(
  '/project/:projectId',
  requirePermission('task:read'),
  validate(taskQuerySchema, 'query'),
  paginate,
  asyncWrapper(taskController.getTasks),
);

// GET /api/v1/tasks (all tasks visible to user)
router.get(
  '/',
  requirePermission('task:read'),
  validate(taskQuerySchema, 'query'),
  paginate,
  asyncWrapper(taskController.getTasks),
);

// GET /api/v1/tasks/:id
router.get(
  '/:id',
  requirePermission('task:read'),
  asyncWrapper(taskController.getTaskById),
);

// PATCH /api/v1/tasks/:id
router.patch(
  '/:id',
  requirePermission('task:update'),
  validate(updateTaskSchema),
  asyncWrapper(taskController.updateTask),
);

// DELETE /api/v1/tasks/:id
router.delete(
  '/:id',
  requirePermission('task:delete'),
  asyncWrapper(taskController.deleteTask),
);

// PATCH /api/v1/tasks/:id/status
router.patch(
  '/:id/status',
  requirePermission('task:update'),
  validate(taskStatusSchema),
  asyncWrapper(taskController.changeStatus),
);

// PATCH /api/v1/tasks/:id/assign
router.patch(
  '/:id/assign',
  requirePermission('task:update'),
  validate(assignTaskSchema),
  asyncWrapper(taskController.assignTask),
);

export default router;
