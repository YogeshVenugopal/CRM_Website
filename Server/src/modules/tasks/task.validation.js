import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  assignee: z.string().regex(objectIdRegex, 'Invalid user ID').optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  dependsOn: z.array(z.string().regex(objectIdRegex, 'Invalid task ID')).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const taskStatusSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
});

export const assignTaskSchema = z.object({
  assignee: z.string().regex(objectIdRegex, 'Invalid user ID').nullable(),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assignee: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
