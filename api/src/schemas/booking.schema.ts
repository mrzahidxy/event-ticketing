import { BookingStatus } from '@prisma/client';
import { z } from 'zod';

export const createBookingSchema = z
  .object({
    eventId: z.string().uuid('Event ID must be a valid UUID'),
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in must be in YYYY-MM-DD format'),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out must be in YYYY-MM-DD format'),
  })
  .refine(
    (data) => {
      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);
      return checkOutDate > checkInDate;
    },
    {
      message: 'Check-out date must be after check-in date',
      path: ['checkOut'],
    }
  );

export const createPublicBookingSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  fullName: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1, 'Full name is required').max(100, 'Full name is too long').optional()
  ),
  email: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().email('A valid email address is required').optional()
  ),
  phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .trim()
      .regex(
        /^[0-9+\-()\s]{7,24}$/,
        'Phone number must be 7-24 characters and contain only digits or common phone symbols'
      )
      .optional()
  ),
  bookingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Booking date must be in YYYY-MM-DD format')
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
      message: 'Booking date must be a valid date',
    }),
  bookingTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Booking time must be in HH:MM 24-hour format'),
  guestCount: z.coerce.number().int().positive('Number of guests must be at least 1').max(20, 'Guest count must be 20 or fewer'),
  notes: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(1000, 'Notes must be 1000 characters or fewer').optional()
  ),
});

export const updateBookingSchema = z
  .object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-in must be in YYYY-MM-DD format').optional(),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Check-out must be in YYYY-MM-DD format').optional(),
    status: z.nativeEnum(BookingStatus).optional(),
  })
  .refine(
    (data) => {
      if (!data.checkIn || !data.checkOut) {
        return true;
      }
      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);
      return checkOutDate > checkInDate;
    },
    {
      message: 'Check-out date must be after check-in date',
      path: ['checkOut'],
    }
  )
  .superRefine((data, ctx) => {
    if (data.status === BookingStatus.CONFIRMED) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'Only Stripe webhook reconciliation can confirm a booking',
      });
    }
  });

export const listBookingsQuerySchema = z.object({
  status: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return val.split(',').map((s) => s.trim());
      }
      return val;
    },
    z.array(z.nativeEnum(BookingStatus)).optional()
  ),
  search: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(1, 'Search term is too short').max(100, 'Search term is too long').optional()
  ),
  eventName: z.string().optional(),
  checkInFrom: z.coerce.date().optional(),
  checkInTo: z.coerce.date().optional(),
  checkOutFrom: z.coerce.date().optional(),
  checkOutTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const userBookingHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const bookingIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform((value) => Number(value)),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreatePublicBookingInput = z.infer<typeof createPublicBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type UserBookingHistoryQuery = z.infer<typeof userBookingHistoryQuerySchema>;
