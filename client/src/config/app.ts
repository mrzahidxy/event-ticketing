import { publicEnv } from '@/config/public-env'

export const appConfig = {
  name: publicEnv.NEXT_PUBLIC_APP_NAME,
  description: publicEnv.NEXT_PUBLIC_APP_DESCRIPTION,
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  apiBaseUrl: publicEnv.NEXT_PUBLIC_API_BASE_URL,
  auth: {
    signInPath: '/login',
    signUpPath: '/register',
    adminHome: '/admin/overview',
    appHome: '/business-owner/dashboard',
    userHome: '/access-denied',
    noAccessPath: '/access-denied',
  },
} as const
