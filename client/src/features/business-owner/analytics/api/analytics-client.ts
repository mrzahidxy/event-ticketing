'use client'

import { apiClient } from '@/lib/api'

import {
  buildAnalyticsQuery,
  resolveOrganizerScopeId,
} from '../utils'
import type {
  AnalyticsBookingsResponse,
  AnalyticsEventsResponse,
  AnalyticsOverviewResponse,
  AnalyticsPaymentsResponse,
  AnalyticsQueryParams,
  AnalyticsUsersResponse,
} from '../types'

export type AnalyticsQuery = AnalyticsQueryParams
type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown>; message?: string }

function unwrapApiEnvelope<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export function buildScopedAnalyticsQuery(
  query?: AnalyticsQuery,
  scope?: { organizerId?: string | null },
) {
  return buildAnalyticsQuery({
    ...query,
    organizerId: query?.organizerId ?? resolveOrganizerScopeId(scope ?? null),
  })
}

export async function fetchAnalyticsOverview(query?: AnalyticsQuery) {
  const response = await apiClient.get<
    AnalyticsOverviewResponse | ApiEnvelope<AnalyticsOverviewResponse>
  >('/api/analytics/overview', {
    auth: true,
    cache: 'no-store',
    query: buildAnalyticsQuery(query ?? {}),
  })
  return unwrapApiEnvelope(response)
}

export async function fetchAnalyticsBookings(query?: AnalyticsQuery) {
  const response = await apiClient.get<
    AnalyticsBookingsResponse | ApiEnvelope<AnalyticsBookingsResponse>
  >('/api/analytics/bookings', {
    auth: true,
    cache: 'no-store',
    query: buildAnalyticsQuery(query ?? {}),
  })
  return unwrapApiEnvelope(response)
}

export async function fetchAnalyticsPayments(query?: AnalyticsQuery) {
  const response = await apiClient.get<
    AnalyticsPaymentsResponse | ApiEnvelope<AnalyticsPaymentsResponse>
  >('/api/analytics/payments', {
    auth: true,
    cache: 'no-store',
    query: buildAnalyticsQuery(query ?? {}),
  })
  return unwrapApiEnvelope(response)
}

export async function fetchAnalyticsEvents(query?: AnalyticsQuery) {
  const response = await apiClient.get<
    AnalyticsEventsResponse | ApiEnvelope<AnalyticsEventsResponse>
  >('/api/analytics/events', {
    auth: true,
    cache: 'no-store',
    query: buildAnalyticsQuery(query ?? {}),
  })
  return unwrapApiEnvelope(response)
}

export async function fetchAnalyticsUsers(query?: AnalyticsQuery) {
  const response = await apiClient.get<
    AnalyticsUsersResponse | ApiEnvelope<AnalyticsUsersResponse>
  >('/api/analytics/users', {
    auth: true,
    cache: 'no-store',
    query: buildAnalyticsQuery(query ?? {}),
  })
  return unwrapApiEnvelope(response)
}
