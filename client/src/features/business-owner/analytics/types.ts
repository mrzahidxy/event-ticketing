export const RANGE_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
] as const

export type RangePreset = (typeof RANGE_OPTIONS)[number]['value']

export type DateRangeParams = {
  from?: string
  to?: string
}

export type AnalyticsGranularity = 'day' | 'week' | 'month'

export type AnalyticsQueryParams = {
  dateFrom?: string
  dateTo?: string
  granularity?: AnalyticsGranularity
  limit?: number
  organizerId?: string
  page?: number
  topLimit?: number
}

export type AnalyticsScope = {
  visibility: 'platform' | 'organizer'
  organizerIds: string[]
}

export type AnalyticsDateRange = {
  dateFrom: string
  dateTo: string
  granularity: AnalyticsGranularity
}

export type AnalyticsTrendPoint = {
  period: string
  primaryValue: number
  secondaryValue?: number
}

export type AnalyticsPaginationMeta = {
  limit: number
  page: number
  totalItems: number
  totalPages: number
}

export type AnalyticsBookingStatusMetric = {
  status: string
  count: number
  revenue: number
}

export type AnalyticsPaymentStatusMetric = {
  status: string
  count: number
  revenue: number
}

export type AnalyticsOverviewEvent = {
  eventId: string
  eventName: string
  organizerId: string
  organizerName: string
  bookingCount: number
  revenue: number
}

export type AnalyticsEventSummary = {
  totalEvents: number
  publishedEvents: number
  unpublishedEvents: number
  averageEventPrice: number
}

export type AnalyticsBookingSummary = {
  totalBookings: number
  totalRevenue: number
  averageOrderValue: number
  bookingsByStatus: AnalyticsBookingStatusMetric[]
}

export type AnalyticsPaymentSummary = {
  totalPayments: number
  totalRevenue: number
  averageTransactionValue: number
  successRate: number
  failureRate: number
  revenueByStatus: AnalyticsPaymentStatusMetric[]
}

export type AnalyticsTopEventPage = {
  data: AnalyticsOverviewEvent[]
  meta: AnalyticsPaginationMeta
}

export type AnalyticsOverviewResponse = {
  scope: AnalyticsScope
  dateRange: AnalyticsDateRange
  bookingSummary: AnalyticsBookingSummary
  paymentSummary: AnalyticsPaymentSummary
  eventSummary: AnalyticsEventSummary
  topEvents: AnalyticsOverviewEvent[]
}

export type AnalyticsBookingsResponse = {
  scope: AnalyticsScope
  dateRange: AnalyticsDateRange
  summary: AnalyticsBookingSummary
  trends: AnalyticsTrendPoint[]
  topEvents: AnalyticsTopEventPage
}

export type AnalyticsPaymentsResponse = {
  scope: AnalyticsScope
  dateRange: AnalyticsDateRange
  summary: AnalyticsPaymentSummary
  trends: AnalyticsTrendPoint[]
}

export type TrendChartPoint = {
  label: string
  primary: number
  secondary: number
}
