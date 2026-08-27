import { Router } from 'express';
import * as quotationController from './quotation.controller.js';
import { authenticate } from '../../core/middleware/auth.js';
import { requirePermission } from '../../core/middleware/rbac.js';
import validate from '../../core/middleware/validate.js';
import { paginate } from '../../core/middleware/pagination.js';
import asyncWrapper from '../../core/utils/asyncWrapper.js';
import {
  createQuotationSchema,
  updateQuotationSchema,
  rejectQuotationSchema,
  quotationQuerySchema,
} from './quotation.validation.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/quotations
router.get(
  '/',
  requirePermission('quotation:read'),
  validate(quotationQuerySchema, 'query'),
  paginate,
  asyncWrapper(quotationController.getQuotations),
);

// POST /api/v1/quotations
router.post(
  '/',
  requirePermission('quotation:create'),
  validate(createQuotationSchema),
  asyncWrapper(quotationController.createQuotation),
);

// GET /api/v1/quotations/:id/pdf
router.get(
  '/:id/pdf',
  requirePermission('quotation:read'),
  asyncWrapper(quotationController.getQuotationPdf),
);

// GET /api/v1/quotations/:id
router.get(
  '/:id',
  requirePermission('quotation:read'),
  asyncWrapper(quotationController.getQuotationById),
);

// PATCH /api/v1/quotations/:id
router.patch(
  '/:id',
  requirePermission('quotation:update'),
  validate(updateQuotationSchema),
  asyncWrapper(quotationController.updateQuotation),
);

// DELETE /api/v1/quotations/:id
router.delete(
  '/:id',
  requirePermission('quotation:delete'),
  asyncWrapper(quotationController.deleteQuotation),
);

// PATCH /api/v1/quotations/:id/send
router.patch(
  '/:id/send',
  requirePermission('quotation:update'),
  asyncWrapper(quotationController.sendQuotation),
);

// PATCH /api/v1/quotations/:id/accept
router.patch(
  '/:id/accept',
  requirePermission('quotation:update'),
  asyncWrapper(quotationController.acceptQuotation),
);

// PATCH /api/v1/quotations/:id/reject
router.patch(
  '/:id/reject',
  requirePermission('quotation:update'),
  validate(rejectQuotationSchema),
  asyncWrapper(quotationController.rejectQuotation),
);

// PATCH /api/v1/quotations/:id/expire
router.patch(
  '/:id/expire',
  requirePermission('quotation:update'),
  asyncWrapper(quotationController.expireQuotation),
);

// POST /api/v1/quotations/:id/version
router.post(
  '/:id/version',
  requirePermission('quotation:create'),
  asyncWrapper(quotationController.createVersion),
);

// GET /api/v1/opportunities/:id/quotations (convenience — mounted on opportunity routes in app.js)
// Handled via a separate route mount

export default router;
