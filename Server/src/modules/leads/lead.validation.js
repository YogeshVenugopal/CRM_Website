import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Lead name is required').max(200).trim(),
  company: z.string().max(200).trim().optional().nullable(),
  email: z.string().email('Invalid email').toLowerCase().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  source: z.enum(['website', 'referral', 'cold_call', 'event', 'ads', 'other']).optional(),
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID').optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
});

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  company: z.string().max(200).trim().optional().nullable(),
  email: z.string().email('Invalid email').toLowerCase().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  source: z.enum(['website', 'referral', 'cold_call', 'event', 'ads', 'other']).optional(),
  tags: z.array(z.string().trim()).optional(),
});

export const assignLeadSchema = z.object({
  assignedTo: z.string().regex(objectIdRegex, 'Invalid user ID'),
});

export const statusUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']),
});

export const leadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']).optional(),
  assignedTo: z.string().optional(),
  source: z.enum(['website', 'referral', 'cold_call', 'event', 'ads', 'other']).optional(),
  tags: z.string().optional(), // comma-separated
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  createdAtFrom: z.string().optional(),
  createdAtTo: z.string().optional(),
});
