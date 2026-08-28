import { Router } from 'express';
import * as financeController from './finance.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  invoiceQuerySchema,
  createPaymentSchema,
} from './finance.validation.js';

const router = Router();

router.use(authenticate);

// ─── Invoice Endpoints ───────────────────────────────────────────────────────

// GET /api/v1/invoices
router.get(
  '/',
  requirePermission('invoice:read'),
  validate(invoiceQuerySchema, 'query'),
  paginate,
  asyncWrapper(financeController.getInvoices),
);

// POST /api/v1/invoices
router.post(
  '/',
  requirePermission('invoice:create'),
  validate(createInvoiceSchema),
  asyncWrapper(financeController.createInvoice),
);

// GET /api/v1/invoices/:id
router.get(
  '/:id',
  requirePermission('invoice:read'),
  asyncWrapper(financeController.getInvoiceById),
);

// PATCH /api/v1/invoices/:id
router.patch(
  '/:id',
  requirePermission('invoice:update'),
  validate(updateInvoiceSchema),
  asyncWrapper(financeController.updateInvoice),
);

// PATCH /api/v1/invoices/:id/send
router.patch(
  '/:id/send',
  requirePermission('invoice:send'),
  asyncWrapper(financeController.sendInvoice),
);

// PATCH /api/v1/invoices/:id/approve
router.patch(
  '/:id/approve',
  requirePermission('invoice:approve'),
  asyncWrapper(financeController.approveInvoice),
);

// PATCH /api/v1/invoices/:id/cancel
router.patch(
  '/:id/cancel',
  requirePermission('invoice:update'),
  asyncWrapper(financeController.cancelInvoice),
);

// ─── Payment Endpoints ───────────────────────────────────────────────────────

// POST /api/v1/invoices/:invoiceId/payments
router.post(
  '/:invoiceId/payments',
  requirePermission('payment:create'),
  validate(createPaymentSchema),
  asyncWrapper(financeController.recordPayment),
);

// GET /api/v1/invoices/:invoiceId/payments
router.get(
  '/:invoiceId/payments',
  requirePermission('payment:read'),
  asyncWrapper(financeController.getPaymentsByInvoice),
);

// GET /api/v1/payments/:id
router.get(
  '/payments/:id',
  requirePermission('payment:read'),
  asyncWrapper(financeController.getPaymentById),
);

export default router;
