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

export const ticketTierIdParamSchema = z.object({
  organizerId: z.string().uuid('Organizer ID must be a valid UUID'),
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  ticketTierId: z.coerce.number().int().positive(),
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

const SUPPORTED_CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud'] as const;

const currencySchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value): value is (typeof SUPPORTED_CURRENCIES)[number] =>
      SUPPORTED_CURRENCIES.includes(value as (typeof SUPPORTED_CURRENCIES)[number]),
    'Currency is not supported'
  );

const salesWindowFields = z.object({
  salesStartAt: z.coerce.date().optional(),
  salesEndAt: z.coerce.date().optional(),
});

export const createTicketTierSchema = z
  .object({
    name: z.string().trim().min(1, 'Ticket tier name is required'),
    description: z.string().trim().optional(),
    price: z.coerce.number().min(0, 'Ticket tier price must be greater than or equal to 0'),
    currency: currencySchema.optional().default('usd'),
    quantityTotal: z.coerce.number().int().positive('quantityTotal must be positive').optional(),
    quantitySold: z.coerce.number().int().min(0, 'quantitySold cannot be negative').optional(),
    isActive: z.boolean().optional(),
  })
  .merge(salesWindowFields)
  .refine(
    (value) =>
      !value.salesStartAt || !value.salesEndAt || value.salesStartAt < value.salesEndAt,
    {
      message: 'salesStartAt must be before salesEndAt',
      path: ['salesEndAt'],
    }
  )
  .refine(
    (value) =>
      value.quantityTotal === undefined ||
      value.quantitySold === undefined ||
      value.quantitySold <= value.quantityTotal,
    {
      message: 'quantitySold cannot be greater than quantityTotal',
      path: ['quantitySold'],
    }
  );

export const updateTicketTierSchema = z
  .object({
    name: z.string().trim().min(1, 'Ticket tier name is required').optional(),
    description: z.string().trim().nullable().optional(),
    price: z.coerce.number().min(0, 'Ticket tier price must be greater than or equal to 0').optional(),
    currency: currencySchema.optional(),
    quantityTotal: z.coerce.number().int().positive('quantityTotal must be positive').optional(),
    quantitySold: z.coerce.number().int().min(0, 'quantitySold cannot be negative').optional(),
    isActive: z.boolean().optional(),
  })
  .merge(salesWindowFields)
  .refine(
    (value) =>
      !value.salesStartAt || !value.salesEndAt || value.salesStartAt < value.salesEndAt,
    {
      message: 'salesStartAt must be before salesEndAt',
      path: ['salesEndAt'],
    }
  )
  .refine(
    (value) =>
      value.quantityTotal === undefined ||
      value.quantitySold === undefined ||
      value.quantitySold <= value.quantityTotal,
    {
      message: 'quantitySold cannot be greater than quantityTotal',
      path: ['quantitySold'],
    }
  );

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
export type CreateTicketTierInput = z.infer<typeof createTicketTierSchema>;
export type UpdateTicketTierInput = z.infer<typeof updateTicketTierSchema>;
export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
export type StaffCandidateQueryInput = z.infer<typeof staffCandidateQuerySchema>;
