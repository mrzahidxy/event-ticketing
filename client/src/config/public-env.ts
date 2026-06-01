import { z } from 'zod'

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().default('event ticketing platfrom'),
  NEXT_PUBLIC_APP_DESCRIPTION: z.string().trim().default('event ticketing platfrom'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000'),
})

export const publicEnv = publicEnvSchema.parse(process.env)
