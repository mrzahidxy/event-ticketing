'use client'

import { apiClient } from '@/lib/api'

import {
  buildAnalyticsQuery,
} from '../utils'
import type {
  AnalyticsEventsResponse,
  AnalyticsBookingsResponse,
  AnalyticsOverviewResponse,
  AnalyticsPaymentsResponse,
  AnalyticsQueryParams,
} from '../types'

export type AnalyticsQuery = AnalyticsQueryParams
type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown>; message?: string }

export async function fetchAnalyticsEvents(organizerId?: string) {
  const response = await apiClient.get<ApiEnvelope<AnalyticsEventsResponse>>(
    '/api/analytics/events',
    { auth: true, query: { organizerId } },
  )
  return unwrapApiEnvelope(response)
}

function unwrapApiEnvelope<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
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
