import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'note', 'follow_up']),
  relatedTo: z.object({
    type: z.enum(['Lead', 'Opportunity', 'Client', 'Project']),
    id: z.string().regex(objectIdRegex, 'Invalid resource ID'),
  }),
  description: z.string().max(2000).trim().optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateActivitySchema = z.object({
  description: z.string().max(2000).trim().optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const activityQuerySchema = z.object({
  relatedToType: z.enum(['Lead', 'Opportunity', 'Client', 'Project']).optional(),
  relatedToId: z.string().regex(objectIdRegex, 'Invalid resource ID').optional(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'follow_up']).optional(),
  before: z.string().regex(objectIdRegex, 'Invalid cursor').optional(),
  owner: z.string().regex(objectIdRegex, 'Invalid user ID').optional(),
  completed: z.enum(['true', 'false']).optional(),
});
