import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const lineItemSchema = z.object({
  description: z.string().min(1, 'Item description is required').max(500).trim(),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  taxPercent: z.number().min(0, 'Tax percent cannot be negative').max(100, 'Tax percent cannot exceed 100'),
});

export const createQuotationSchema = z.object({
  opportunity: z.string().regex(objectIdRegex, 'Invalid opportunity ID'),
  client: z.string().regex(objectIdRegex, 'Invalid client ID').optional().nullable(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  validUntil: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  termsAndConditions: z.string().max(5000).trim().optional().nullable(),
});

export const updateQuotationSchema = z.object({
  client: z.string().regex(objectIdRegex, 'Invalid client ID').optional().nullable(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required').optional(),
  validUntil: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  termsAndConditions: z.string().max(5000).trim().optional().nullable(),
});

export const rejectQuotationSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500).trim(),
});

export const quotationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
  opportunity: z.string().optional(),
  client: z.string().optional(),
  createdBy: z.string().optional(),
  validUntilFrom: z.string().optional(),
  validUntilTo: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
