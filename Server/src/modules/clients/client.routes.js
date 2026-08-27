import { Router } from 'express';
import * as clientController from './client.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createClientSchema,
  updateClientSchema,
  clientQuerySchema,
} from './client.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/clients
router.get(
  '/',
  requirePermission('client:read'),
  validate(clientQuerySchema, 'query'),
  paginate,
  asyncWrapper(clientController.getClients),
);

// POST /api/v1/clients
router.post(
  '/',
  requirePermission('client:create'),
  validate(createClientSchema),
  asyncWrapper(clientController.createClient),
);

// GET /api/v1/clients/:id/360
router.get(
  '/:id/360',
  requirePermission('client:read'),
  asyncWrapper(clientController.getClient360),
);

// GET /api/v1/clients/:id
router.get(
  '/:id',
  requirePermission('client:read'),
  asyncWrapper(clientController.getClientById),
);

// PATCH /api/v1/clients/:id
router.patch(
  '/:id',
  requirePermission('client:update'),
  validate(updateClientSchema),
  asyncWrapper(clientController.updateClient),
);

// DELETE /api/v1/clients/:id
router.delete(
  '/:id',
  requirePermission('client:delete'),
  asyncWrapper(clientController.deleteClient),
);

export default router;
