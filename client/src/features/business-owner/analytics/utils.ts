import { formatDate, formatCurrency } from '@/lib/format'

import type { Activity as ActivityListItem } from '../dashboard/components/activity-list'
import type {
  AnalyticsEventByOrganizer,
  AnalyticsOverviewEvent,
  AnalyticsPaymentStatusMetric,
  AnalyticsStaffPerformance,
  AnalyticsTrendPoint,
  DateRangeParams,
  RangePreset,
  TrendChartPoint,
} from './types'

export function resolveOrganizerScopeId(
  user?: { organizerId?: string | null } | null,
) {
  return user?.organizerId ?? null
}

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
    label: metric.status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    value: metric.revenue,
  }))
}

export function mapTopEventsToActivity(
  items: AnalyticsOverviewEvent[],
): ActivityListItem[] {
  return items.map((item) => ({
    id: item.eventId,
    title: item.eventName,
    description: `${item.organizerName} · ${item.bookingCount.toLocaleString()} bookings`,
    meta: formatCurrency(item.revenue),
  }))
}

export function mapOrganizerEventsToActivity(
  items: AnalyticsEventByOrganizer[],
): ActivityListItem[] {
  return items.map((item) => ({
    id: item.organizerId,
    title: item.organizerName,
    description: `${item.totalEvents.toLocaleString()} events · ${item.publishedEvents.toLocaleString()} published`,
    meta: `Avg ${formatCurrency(item.averagePrice)}`,
  }))
}

export function mapStaffPerformanceToActivity(
  items: AnalyticsStaffPerformance[],
): ActivityListItem[] {
  return items.map((item) => ({
    id: String(item.userId),
    title: item.name?.trim() || item.email,
    description: `${item.bookingCount.toLocaleString()} bookings · ${item.assignedOrganizerCount.toLocaleString()} organizer${item.assignedOrganizerCount === 1 ? '' : 's'}`,
    meta: item.latestAssignmentAt ? formatDate(item.latestAssignmentAt) : formatCurrency(item.revenue),
  }))
}
