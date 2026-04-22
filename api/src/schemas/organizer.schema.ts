import { z } from 'zod';

export const organizerIdParamSchema = z.object({
  organizerId: z.string().uuid('Organizer ID must be a valid UUID'),
});

export const organizerEventParamsSchema = z.object({
  organizerId: z.string().uuid('Organizer ID must be a valid UUID'),
  eventId: z.string().uuid('Event ID must be a valid UUID'),
});

export const organizerStaffParamsSchema = z.object({
  organizerId: z.string().uuid('Organizer ID must be a valid UUID'),
  userId: z.coerce.number().int().positive(),
});

export const createOrganizerSchema = z.object({
  name: z.string().min(1, 'Organizer name is required'),
  ownerId: z.coerce.number().int().positive().optional(),
});

export const updateOrganizerSchema = z.object({
  name: z.string().min(1, 'Organizer name is required'),
});

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  price: z.coerce.number().positive('Event price must be greater than 0'),
  isPublished: z.boolean().optional().default(false),
});

export const updateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().positive('Event price must be greater than 0').optional(),
  isPublished: z.boolean().optional(),
});

export const assignStaffSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const staffCandidateQuerySchema = z.object({
  search: z.string().trim().min(2, 'Search must be at least 2 characters'),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

export type CreateOrganizerInput = z.infer<typeof createOrganizerSchema>;
export type UpdateOrganizerInput = z.infer<typeof updateOrganizerSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
export type StaffCandidateQueryInput = z.infer<typeof staffCandidateQuerySchema>;
