import { formatCurrency } from '@/lib/format'

import type { Activity as ActivityListItem } from '../dashboard/components/activity-list'
import type {
  AnalyticsOverviewEvent,
  AnalyticsPaymentStatusMetric,
  AnalyticsTrendPoint,
  DateRangeParams,
  RangePreset,
  TrendChartPoint,
} from './types'

export function getDateRange(preset: RangePreset): DateRangeParams {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (preset === '7d') {
    start.setDate(start.getDate() - 6)
  } else if (preset === '30d') {
    start.setDate(start.getDate() - 29)
  }

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

export function buildAnalyticsQuery({
  dateFrom,
  dateTo,
  granularity = 'day',
  limit,
  organizerId,
  page,
  topLimit,
}: {
  dateFrom?: string
  dateTo?: string
  granularity?: 'day' | 'week' | 'month'
  limit?: number
  organizerId?: string | null
  page?: number
  topLimit?: number
}) {
  return {
    dateFrom,
    dateTo,
    granularity,
    limit,
    organizerId: organizerId ?? undefined,
    page,
    topLimit,
  }
}

export function mapTrendPoints(trends: AnalyticsTrendPoint[]): TrendChartPoint[] {
  return trends.map((point) => ({
    label: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(point.period)),
    primary: point.primaryValue,
    secondary: point.secondaryValue ?? 0,
  }))
}

export function mapPaymentStatusBreakdown(
  metrics: AnalyticsPaymentStatusMetric[],
) {
  return metrics.map((metric) => ({
    label:
      metric.status === 'SUCCEEDED'
        ? 'Successful'
        : metric.status.charAt(0) + metric.status.slice(1).toLowerCase(),
    value: metric.revenue,
    count: metric.count,
  }))
}

export function mapTopEventsToActivity(
  items: AnalyticsOverviewEvent[],
): ActivityListItem[] {
  return items.map((item) => ({
    id: item.eventId,
    title: item.eventName,
    description: `${item.organizerName} | ${item.bookingCount.toLocaleString()} bookings`,
    meta: formatCurrency(item.revenue),
  }))
}
