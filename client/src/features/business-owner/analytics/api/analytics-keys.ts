import type { AnalyticsQueryParams } from '../types'

function queryKeyParts(query?: AnalyticsQueryParams) {
  return [
    query?.organizerId ?? null,
    query?.dateFrom ?? null,
    query?.dateTo ?? null,
    query?.granularity ?? 'day',
    query?.page ?? null,
    query?.limit ?? null,
    query?.topLimit ?? null,
  ] as const
}

export const analyticsKeys = {
  root: ['analytics'] as const,
  overview: (query?: AnalyticsQueryParams) =>
    ['analytics', 'overview', ...queryKeyParts(query)] as const,
  bookings: (query?: AnalyticsQueryParams) =>
    ['analytics', 'bookings', ...queryKeyParts(query)] as const,
  payments: (query?: AnalyticsQueryParams) =>
    ['analytics', 'payments', ...queryKeyParts(query)] as const,
  events: (query?: AnalyticsQueryParams) =>
    ['analytics', 'events', ...queryKeyParts(query)] as const,
  users: (query?: AnalyticsQueryParams) =>
    ['analytics', 'users', ...queryKeyParts(query)] as const,
}
