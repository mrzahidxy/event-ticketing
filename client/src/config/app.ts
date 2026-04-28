import { env } from '@/config/env'

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  description: env.NEXT_PUBLIC_APP_DESCRIPTION,
  url: env.NEXT_PUBLIC_SITE_URL,
  apiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  auth: {
    signInPath: '/login',
    signUpPath: '/register',
    adminHome: '/admin/overview',
    appHome: '/business-owner/dashboard',
    userHome: '/access-denied',
    noAccessPath: '/access-denied',
  },
} as const
