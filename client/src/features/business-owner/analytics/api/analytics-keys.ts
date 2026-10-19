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
  events: (actorId?: string | number, organizerId?: string) =>
    ['analytics', 'events', actorId ?? null, organizerId ?? null] as const,
  overview: (query?: AnalyticsQueryParams) =>
    ['analytics', 'overview', ...queryKeyParts(query)] as const,
  bookings: (query?: AnalyticsQueryParams) =>
    ['analytics', 'bookings', ...queryKeyParts(query)] as const,
  payments: (query?: AnalyticsQueryParams) =>
    ['analytics', 'payments', ...queryKeyParts(query)] as const,
}
