import { z } from 'zod';

export const ticketCheckInSchema = z
  .object({
    qrPayload: z.string().trim().min(1, 'QR/token is required').max(512, 'QR/token is too long'),
  })
  .strict();

export type TicketCheckInInput = z.infer<typeof ticketCheckInSchema>;
