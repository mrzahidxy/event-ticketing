import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().trim().default('event ticketing platfrom'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().trim().default('event ticketing platfrom'),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000'),
})
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed')
}

export const env = parsed.data
