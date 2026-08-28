import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  client: z.string().regex(objectIdRegex, 'Invalid client ID').optional().nullable(),
  sourceOpportunity: z.string().regex(objectIdRegex, 'Invalid opportunity ID').optional().nullable(),
  sourceQuotation: z.string().regex(objectIdRegex, 'Invalid quotation ID').optional().nullable(),
  manager: z.string().regex(objectIdRegex, 'Invalid user ID').optional().nullable(),
  team: z.array(z.string().regex(objectIdRegex, 'Invalid user ID')).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  budget: z.number().min(0, 'Budget cannot be negative').optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  budget: z.number().min(0).optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
});

export const projectStatusSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']),
});

export const assignManagerSchema = z.object({
  manager: z.string().regex(objectIdRegex, 'Invalid user ID').nullable(),
});

export const assignTeamSchema = z.object({
  team: z.array(z.string().regex(objectIdRegex, 'Invalid user ID')),
});

export const projectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
  client: z.string().optional(),
  manager: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
