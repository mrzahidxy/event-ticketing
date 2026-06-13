import { z } from 'zod'

const publicApiBaseUrlSchema =
  process.env.NODE_ENV === 'production'
    ? z.string().url()
    : z.string().url().default('http://localhost:4000')
const publicSiteUrlSchema =
  process.env.NODE_ENV === 'production'
    ? z.string().url()
    : z.string().url().default('http://localhost:3000')

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().default('event ticketing platfrom'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().trim().default('event ticketing platfrom'),
  NEXT_PUBLIC_SITE_URL: publicSiteUrlSchema,
  NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrlSchema,
})

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
})
