import { z } from 'zod';

export const updateOrganizerStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export type UpdateOrganizerStatusInput = z.infer<typeof updateOrganizerStatusSchema>;
