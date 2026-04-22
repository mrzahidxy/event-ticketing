import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;
