import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PHASE: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().trim().min(1),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
})
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed')
}

if (
  parsed.data.NODE_ENV === 'production' &&
  !parsed.data.AUTH_SECRET &&
  !parsed.data.NEXTAUTH_SECRET
) {
  throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is required in production')
}

export const env = parsed.data
