'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { Activity, Receipt, UsersRound, Wallet } from 'lucide-react'
import { useSession } from 'next-auth/react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { formatCurrency } from '@/lib/format'
import { normalizeUserRole } from '@/types/user'

import { ActivityList } from '../dashboard/components/activity-list'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'
import { StatCard } from '../dashboard/components/stat-card'
import { analyticsKeys } from './api/analytics-keys'
import {
  fetchAnalyticsBookings,
  fetchAnalyticsEvents,
  fetchAnalyticsOverview,
  fetchAnalyticsPayments,
  fetchAnalyticsUsers,
} from './api/analytics-client'
import {
  getDateRange,
  mapOrganizerEventsToActivity,
  mapPaymentStatusBreakdown,
  mapStaffPerformanceToActivity,
  mapTopEventsToActivity,
  mapTrendPoints,
  resolveOrganizerScopeId,
} from './utils'
import { RANGE_OPTIONS, type RangePreset } from './types'

const ChartSkeleton = () => (
  <div className="h-[280px] w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/40" />
)

const AreaChart = dynamic(
  () =>
    import('@/components/charts/area-chart').then((mod) => ({
      default: mod.AreaChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

const BarChart = dynamic(
  () =>
    import('@/components/charts/bar-chart').then((mod) => ({
      default: mod.BarChart,
    })),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
      <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
      {message}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d')
  const range = useMemo(() => getDateRange(rangePreset), [rangePreset])
  const organizerId = resolveOrganizerScopeId(session?.user ?? null)
  const role = normalizeUserRole(session?.user?.role)
  const canRequestAnalytics = role === 'ADMIN' || role === 'OWNER' || role === 'STAFF'

  const queryParams = useMemo(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      granularity: 'day' as const,
      organizerId: organizerId ?? undefined,
      page: 1,
      limit: 5,
      topLimit: 5,
    }),
    [organizerId, range],
  )

  const overviewQuery = useQuery({
    queryKey: analyticsKeys.overview(queryParams),
    queryFn: () => fetchAnalyticsOverview(queryParams),
    enabled: status !== 'loading' && canRequestAnalytics,
  })

  const bookingsQuery = useQuery({
    queryKey: analyticsKeys.bookings(queryParams),
    queryFn: () => fetchAnalyticsBookings(queryParams),
    enabled: status !== 'loading' && canRequestAnalytics,
  })

  const paymentsQuery = useQuery({
    queryKey: analyticsKeys.payments(queryParams),
    queryFn: () => fetchAnalyticsPayments(queryParams),
    enabled: status !== 'loading' && canRequestAnalytics,
  })

  const eventsQuery = useQuery({
    queryKey: analyticsKeys.events(queryParams),
    queryFn: () => fetchAnalyticsEvents(queryParams),
    enabled: status !== 'loading' && canRequestAnalytics,
  })

  const usersQuery = useQuery({
    queryKey: analyticsKeys.users(queryParams),
    queryFn: () => fetchAnalyticsUsers(queryParams),
    enabled: status !== 'loading' && canRequestAnalytics,
  })

  const overview = overviewQuery.data ?? null
  const requestError =
    overviewQuery.error ??
    bookingsQuery.error ??
    paymentsQuery.error ??
    eventsQuery.error ??
    usersQuery.error
  const errorMessage = requestError
    ? requestError instanceof Error
      ? requestError.message
      : 'One or more analytics requests failed.'
    : null

  const stats = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      {
        label: 'Revenue',
        value: formatCurrency(overview.paymentSummary.totalRevenue),
        helper: `Success ${overview.paymentSummary.successRate.toFixed(1)}%`,
        icon: <Wallet className="h-5 w-5" />,
      },
      {
        label: 'Bookings',
        value: overview.bookingSummary.totalBookings.toLocaleString(),
        helper: `AOV ${formatCurrency(overview.bookingSummary.averageOrderValue)}`,
        icon: <Receipt className="h-5 w-5" />,
      },
      {
        label: 'Events',
        value: overview.eventSummary.totalEvents.toLocaleString(),
        helper: `Published ${overview.eventSummary.publishedEvents.toLocaleString()}`,
        icon: <Activity className="h-5 w-5" />,
      },
      {
        label: 'Users',
        value: overview.userSummary.totalScopedUsers.toLocaleString(),
        helper: `Registrations ${overview.userSummary.registrationsInRange.toLocaleString()}`,
        icon: <UsersRound className="h-5 w-5" />,
      },
    ]
  }, [overview])

  const bookingsChartData = useMemo(
    () => mapTrendPoints(bookingsQuery.data?.trends ?? []),
    [bookingsQuery.data?.trends],
  )
  const paymentsData = useMemo(
    () =>
      mapPaymentStatusBreakdown(
        paymentsQuery.data?.summary.revenueByStatus ?? [],
      ),
    [paymentsQuery.data?.summary.revenueByStatus],
  )
  const recentActivityItems = useMemo(
    () => mapTopEventsToActivity(overview?.topEvents ?? []),
    [overview?.topEvents],
  )
  const eventsByOrganizerItems = useMemo(
    () =>
      mapOrganizerEventsToActivity(eventsQuery.data?.eventsByOrganizer ?? []),
    [eventsQuery.data?.eventsByOrganizer],
  )
  const staffPerformanceItems = useMemo(
    () =>
      mapStaffPerformanceToActivity(
        usersQuery.data?.staffPerformance.data ?? [],
      ),
    [usersQuery.data?.staffPerformance.data],
  )

  const isLoadingOverview = canRequestAnalytics && overviewQuery.isLoading
  const isLoadingBookings = canRequestAnalytics && bookingsQuery.isLoading
  const isLoadingPayments = canRequestAnalytics && paymentsQuery.isLoading
  const isLoadingEvents = canRequestAnalytics && eventsQuery.isLoading
  const isLoadingUsers = canRequestAnalytics && usersQuery.isLoading

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Analytics"
        description="Deep-dive organizer trends and performance breakdowns from the Express API"
        actions={
          <Select
            value={rangePreset}
            onChange={(event) =>
              setRangePreset(event.target.value as RangePreset)
            }
            className="w-[160px]"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        }
      />

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load analytics</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {!canRequestAnalytics
          ? Array.from({ length: 4 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))
          : isLoadingOverview && !stats.length
            ? Array.from({ length: 4 }).map((_, index) => (
                <StatCardSkeleton key={index} />
              ))
            : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <SectionCard
        title="Bookings vs. Revenue"
        subtitle="Track booking volume and revenue over time."
      >
        {bookingsChartData.length ? (
          <AreaChart data={bookingsChartData} />
        ) : isLoadingBookings ? (
          <ChartSkeleton />
        ) : (
          <EmptyState message="No booking trend data was returned for this range." />
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Recent Activity" className="lg:col-span-2">
          {!canRequestAnalytics ? (
            <EmptyState message="Organizer analytics are unavailable until the account is scoped." />
          ) : isLoadingOverview ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          ) : recentActivityItems.length ? (
            <ActivityList items={recentActivityItems} />
          ) : (
            <EmptyState message="No live activity was returned by the overview endpoint." />
          )}
        </SectionCard>

        <SectionCard title="Payments Breakdown">
          {paymentsData.length ? (
            <BarChart data={paymentsData} />
          ) : isLoadingPayments ? (
            <ChartSkeleton />
          ) : (
            <EmptyState message="No payment breakdown was returned for this range." />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Events by Organizer">
          {eventsByOrganizerItems.length ? (
            <ActivityList items={eventsByOrganizerItems} />
          ) : isLoadingEvents ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No organizer event aggregates were returned." />
          )}
        </SectionCard>

        <SectionCard title="Staff Performance">
          {staffPerformanceItems.length ? (
            <ActivityList items={staffPerformanceItems} />
          ) : isLoadingUsers ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No staff performance data was returned." />
          )}
        </SectionCard>
      </div>
    </div>
  )
}
