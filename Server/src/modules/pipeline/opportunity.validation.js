import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  lead: z.string().regex(objectIdRegex, 'Invalid lead ID').optional().nullable(),
  client: z.string().regex(objectIdRegex, 'Invalid client ID').optional().nullable(),
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  value: z.number().min(0, 'Value cannot be negative'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional().nullable(),
});

export const updateOpportunitySchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  value: z.number().min(0).optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  client: z.string().regex(objectIdRegex, 'Invalid client ID').optional().nullable(),
});

export const stageUpdateSchema = z.object({
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost']),
});

export const markLostSchema = z.object({
  reason: z.string().min(1, 'Lost reason is required').max(500).trim(),
});

export const markWonSchema = z.object({
  quotationId: z.string().regex(objectIdRegex, 'Invalid quotation ID').optional().nullable(),
});

export const assignOpportunitySchema = z.object({
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID'),
});

export const opportunityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  assignedTo: z.string().optional(),
  client: z.string().optional(),
  lead: z.string().optional(),
  valueMin: z.coerce.number().optional(),
  valueMax: z.coerce.number().optional(),
  expectedCloseFrom: z.string().optional(),
  expectedCloseTo: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
