import { z } from 'zod'

const publicApiBaseUrlSchema =
  process.env.NODE_ENV === 'production'
    ? z.string().url()
    : z.string().url().default('http://localhost:4000')
const siteUrlSchema =
  process.env.NODE_ENV === 'production'
    ? z.string().url()
    : z.string().url().default('http://localhost:3000')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().trim().default('Multi-Tenant Event Intelligence Platform'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().trim().default('Multi-tenant event intelligence platform'),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: siteUrlSchema,
  NEXT_PUBLIC_SITE_URL: siteUrlSchema,
  NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrlSchema,
  API_INTERNAL_BASE_URL: z.string().url().optional(),
})
const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors)
  throw new Error('Environment validation failed')
}

export const env = parsed.data
