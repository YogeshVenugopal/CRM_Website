import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: z.string().email('Invalid email').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.string().regex(objectIdRegex, 'Invalid role ID'),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email('Invalid email').toLowerCase().trim().optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
});

export const updateRoleSchema = z.object({
  role: z.string().regex(objectIdRegex, 'Invalid role ID'),
});

export const queryParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});
