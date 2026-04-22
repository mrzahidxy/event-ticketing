import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
})

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
}

const parsed = envSchema.safeParse(rawEnv)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed')
}

export const env = {
  ...parsed.data,
  NEXT_PUBLIC_SITE_URL: parsed.data.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_API_BASE_URL:
    parsed.data.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:8080',
}
