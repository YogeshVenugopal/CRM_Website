import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200).trim(),
  primaryContact: z.object({
    name: z.string().min(1, 'Contact name is required').max(100).trim(),
    email: z.string().email('Invalid email').toLowerCase().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
  }),
  billingAddress: z.string().max(500).trim().optional().nullable(),
  accountOwner: z.string().regex(objectIdRegex, 'Invalid user ID').optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateClientSchema = z.object({
  companyName: z.string().min(1).max(200).trim().optional(),
  primaryContact: z
    .object({
      name: z.string().min(1).max(100).trim().optional(),
      email: z.string().email('Invalid email').toLowerCase().trim().optional().nullable(),
      phone: z.string().trim().optional().nullable(),
    })
    .optional(),
  billingAddress: z.string().max(500).trim().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const clientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  accountOwner: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
