import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(500).trim(),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  taxPercent: z.number().min(0, 'Tax cannot be negative').max(100, 'Tax cannot exceed 100'),
});

// ─── Invoice Schemas ─────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  client: z.string().regex(objectIdRegex, 'Invalid client ID').optional().nullable(),
  project: z.string().regex(objectIdRegex, 'Invalid project ID').optional().nullable(),
  opportunity: z.string().regex(objectIdRegex, 'Invalid opportunity ID').optional().nullable(),
  quotation: z.string().regex(objectIdRegex, 'Invalid quotation ID').optional().nullable(),
  items: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
});

export const updateInvoiceSchema = z.object({
  notes: z.string().max(2000).trim().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional(),
  client: z.string().optional(),
  project: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ─── Payment Schemas ─────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
  method: z.enum(['bank_transfer', 'cash', 'card', 'upi', 'other']),
  transactionRef: z.string().max(200).trim().optional().nullable(),
  paidAt: z.string().datetime().optional(),
  notes: z.string().max(500).trim().optional().nullable(),
});
