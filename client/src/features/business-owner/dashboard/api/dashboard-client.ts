'use client'

import { apiClient } from '@/lib/api'

import { buildScopedAnalyticsQuery } from '../../analytics/api/analytics-client'
import type {
  AnalyticsOverviewResponse,
  AnalyticsQueryParams,
} from '../../analytics/types'

export type DashboardOverviewQuery = AnalyticsQueryParams
export type DashboardOverviewResponse = AnalyticsOverviewResponse

const DEFAULT_TOP_LIMIT = 6
type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown>; message?: string }

function unwrapApiEnvelope<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export async function fetchDashboardOverview(
  query?: DashboardOverviewQuery,
  scope?: { organizerId?: string | null },
) {
  const response = await apiClient.get<
    DashboardOverviewResponse | ApiEnvelope<DashboardOverviewResponse>
  >('/api/analytics/overview', {
    auth: true,
    cache: 'no-store',
    query: buildScopedAnalyticsQuery(
      {
        ...query,
        topLimit: query?.topLimit ?? DEFAULT_TOP_LIMIT,
      },
      scope,
    ),
  })

  return unwrapApiEnvelope(response)
}
