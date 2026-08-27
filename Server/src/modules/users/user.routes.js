import { Router } from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import { createUserSchema, updateUserSchema, updateRoleSchema, queryParamsSchema } from './user.validation.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users — admin:read, management:read
router.get(
  '/',
  requirePermission('user:read'),
  validate(queryParamsSchema, 'query'),
  paginate,
  asyncWrapper(userController.getUsers),
);

// GET /api/v1/roles
router.get(
  '/roles',
  requirePermission('role:read'),
  asyncWrapper(userController.getRoles),
);

// POST /api/v1/users — admin only
router.post(
  '/',
  requirePermission('user:create'),
  validate(createUserSchema),
  asyncWrapper(userController.createUser),
);

// GET /api/v1/users/:id — admin:read, management:read
router.get(
  '/:id',
  requirePermission('user:read'),
  asyncWrapper(userController.getUserById),
);

// PATCH /api/v1/users/:id — admin only
router.patch(
  '/:id',
  requirePermission('user:update'),
  validate(updateUserSchema),
  asyncWrapper(userController.updateUser),
);

// PATCH /api/v1/users/:id/activate — admin only
router.patch(
  '/:id/activate',
  requirePermission('user:update'),
  asyncWrapper(userController.activateUser),
);

// PATCH /api/v1/users/:id/deactivate — admin only
router.patch(
  '/:id/deactivate',
  requirePermission('user:update'),
  asyncWrapper(userController.deactivateUser),
);

// PATCH /api/v1/users/:id/role — admin only
router.patch(
  '/:id/role',
  requirePermission('user:update'),
  validate(updateRoleSchema),
  asyncWrapper(userController.updateUserRole),
);

export default router;
