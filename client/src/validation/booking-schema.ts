import { z } from 'zod'

const bookingStatusSchema = z.enum([
  'CONFIRMED',
  'PENDING',
  'CANCELLED',
  'COMPLETED',
])

function normalizeDate(
  value: string,
  ctx: z.RefinementCtx,
  field: 'checkIn' | 'checkOut' | 'bookingDate',
) {
  const trimmed = value.trim()
  if (!trimmed) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        field === 'checkIn'
          ? 'Check-in is required'
          : field === 'checkOut'
            ? 'Check-out is required'
            : 'Booking date is required',
    })
    return z.NEVER
  }

  const [datePart] = trimmed.split('T')

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        field === 'checkIn'
          ? 'Check-in must be in YYYY-MM-DD format'
          : field === 'checkOut'
            ? 'Check-out must be in YYYY-MM-DD format'
            : 'Booking date must be in YYYY-MM-DD format',
    })
    return z.NEVER
  }

  const parsed = Date.parse(datePart)
  if (Number.isNaN(parsed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        field === 'checkIn'
          ? 'Check-in must be a valid date'
          : field === 'checkOut'
            ? 'Check-out must be a valid date'
            : 'Booking date must be a valid date',
    })
    return z.NEVER
  }

  return datePart
}

export const bookingFormSchema = z.object({
  eventId: z.string().trim().optional(),
  status: bookingStatusSchema.optional(),
  checkIn: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .transform((val, ctx) => normalizeDate(val, ctx, 'checkIn'))
      .optional(),
  ),
  checkOut: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
      .string()
      .transform((val, ctx) => normalizeDate(val, ctx, 'checkOut'))
      .optional(),
  ),
}).superRefine((data, ctx) => {
  if (!data.checkIn || !data.checkOut) {
    return
  }

  const checkInDate = new Date(data.checkIn)
  const checkOutDate = new Date(data.checkOut)

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    return
  }

  if (checkInDate >= checkOutDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['checkOut'],
      message: 'Check-out date must be after check-in date',
    })
  }
})

export const bookingCreateFormSchema = bookingFormSchema.superRefine((data, ctx) => {
  if (!data.eventId?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['eventId'],
      message: 'Please select an event',
    })
  }

  if (!data.checkIn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['checkIn'],
      message: 'Check-in is required',
    })
  }

  if (!data.checkOut) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['checkOut'],
      message: 'Check-out is required',
    })
  }
})

export const bookingUpdateFormSchema = bookingFormSchema

const publicOrganizerBookingBaseSchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
  ticketTierId: z.coerce
    .number({ invalid_type_error: 'Ticket tier is required' })
    .int('Ticket tier ID must be a whole number')
    .positive('Please select a ticket tier'),
  bookingDate: z
    .string()
    .transform((val, ctx) => normalizeDate(val, ctx, 'bookingDate')),
  bookingTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Booking time must be in HH:MM 24-hour format'),
  quantity: z.coerce
    .number({
      invalid_type_error: 'Quantity is required',
    })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  guestCount: z.coerce
    .number()
    .int('Guest count must be a whole number')
    .min(1, 'Guest count must be at least 1')
    .optional(),
  fullName: z
    .string()
    .trim()
    .max(100, 'Full name must be 100 characters or fewer')
    .optional(),
  email: z
    .string()
    .trim()
    .email('A valid email address is required')
    .optional(),
  phone: z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z
        .string()
        .trim()
        .min(7, 'A valid phone number is required')
        .max(24, 'Phone number must be 24 characters or fewer')
        .regex(/^[0-9+\-()\s]+$/, 'A valid phone number is required')
        .optional()
    ),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or fewer')
    .optional()
    .transform((value) => value ?? ''),
})

export const publicOrganizerBookingSchema = publicOrganizerBookingBaseSchema

export const guestPublicOrganizerBookingSchema = publicOrganizerBookingBaseSchema.superRefine((data, ctx) => {
  if (!data.fullName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fullName'],
      message: 'Full name is required',
    })
  }

  if (!data.email?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'A valid email address is required',
    })
  }

  if (!data.phone?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone'],
      message: 'A valid phone number is required',
    })
  }
})

export const authenticatedPublicOrganizerBookingSchema = publicOrganizerBookingBaseSchema.superRefine((data, ctx) => {
  if (!data.email?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'An email address is required',
    })
  }
})

export const bookingStatus = bookingStatusSchema
