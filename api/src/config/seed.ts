import 'dotenv/config';

import { z } from 'zod';

const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().trim().min(1),
  SEED_ADMIN_PASSWORD: z.string().min(1),
  SEED_OWNER_EMAIL: z.string().trim().min(1),
  SEED_OWNER_PASSWORD: z.string().min(1),
  SEED_STAFF_EMAIL: z.string().trim().min(1),
  SEED_STAFF_PASSWORD: z.string().min(1),
  SEED_USER_EMAIL: z.string().trim().min(1),
  SEED_USER_PASSWORD: z.string().min(1),
});

const parsed = seedEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid seed environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Seed environment validation failed');
}

export const seedEnv = parsed.data;
