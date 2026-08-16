import type { Route } from 'next'

import { appConfig } from '@/config/app'
import { normalizeUserRole } from '@/types/user'

export const authRoutes = appConfig.auth

export function getDefaultRedirectForRole(role?: string | null): Route {
  const normalized = normalizeUserRole(role)

  if (normalized === 'ADMIN') {
    return authRoutes.adminHome as Route
  }

  if (normalized === 'OWNER' || normalized === 'STAFF') {
    return authRoutes.appHome as Route
  }

  if (normalized === 'USER') {
    return authRoutes.userHome as Route
  }

  if (normalized === 'GUEST') {
    return authRoutes.noAccessPath as Route
  }

  return authRoutes.noAccessPath as Route
}
