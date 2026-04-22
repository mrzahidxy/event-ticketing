'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  Activity,
  CreditCard,
  Receipt,
  Upload,
  UsersRound,
  Wallet,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import { normalizeUserRole } from '@/types/user'

import { analyticsKeys } from '../analytics/api/analytics-keys'
import { getDateRange, mapTopEventsToActivity, resolveOrganizerScopeId } from '../analytics/utils'
import { ActivityList } from './components/activity-list'
import { DashboardHeader } from './components/dashboard-header'
import { QuickAction, QuickActions } from './components/quick-actions'
import { SectionCard } from './components/section-card'
import { StatCard, type StatCardProps } from './components/stat-card'
import {
  fetchDashboardOverview,
  type DashboardOverviewResponse,
} from './api/dashboard-client'

const quickActions = [
  { icon: <Upload className="h-4 w-4" />, label: 'Create Event' },
  { icon: <Receipt className="h-4 w-4" />, label: 'Review Bookings' },
  { icon: <CreditCard className="h-4 w-4" />, label: 'View Revenue Trends' },
]

const RECENT_ACTIVITY_LIMIT = 6

type DashboardStatCard = Omit<StatCardProps, 'className'>

function buildDashboardStats(
  overview: DashboardOverviewResponse,
): DashboardStatCard[] {
  const bookingSummary = overview.bookingSummary ?? {
    totalBookings: 0,
    averageOrderValue: 0,
  }
  const paymentSummary = overview.paymentSummary ?? {
    totalRevenue: 0,
    totalPayments: 0,
  }
  const eventSummary = overview.eventSummary ?? {
    totalEvents: 0,
    publishedEvents: 0,
  }
  const userSummary = overview.userSummary ?? {
    totalScopedUsers: 0,
    registrationsInRange: 0,
  }

  return [
    {
      label: 'Revenue',
      value: formatCurrency(paymentSummary.totalRevenue),
      helper: `AOV ${formatCurrency(bookingSummary.averageOrderValue)}`,
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: 'Bookings',
      value: bookingSummary.totalBookings.toLocaleString(),
      helper: `Payments ${paymentSummary.totalPayments.toLocaleString()}`,
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      label: 'Events',
      value: eventSummary.totalEvents.toLocaleString(),
      helper: `Published ${eventSummary.publishedEvents.toLocaleString()}`,
      icon: <Activity className="h-5 w-5" />,
    },
    {
      label: 'Users',
      value: userSummary.totalScopedUsers.toLocaleString(),
      helper: `Registrations ${userSummary.registrationsInRange.toLocaleString()}`,
      icon: <UsersRound className="h-5 w-5" />,
    },
  ]
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
        />
      ))}
    </div>
  )
}

function EmptyScopedState() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
      This dashboard is scoped to a business-owner organizer. The signed-in account does not
      currently expose an organizer assignment, so there is no analytics scope to load.
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const range = useMemo(() => getDateRange('7d'), [])
  const organizerId = resolveOrganizerScopeId(session?.user ?? null)
  const role = normalizeUserRole(session?.user?.role)
  const canRequestAnalytics = role === 'ADMIN' || role === 'OWNER' || role === 'STAFF'

  const overviewQueryParams = useMemo(
    () => ({
      dateFrom: range.from,
      dateTo: range.to,
      organizerId: organizerId ?? undefined,
      topLimit: RECENT_ACTIVITY_LIMIT,
    }),
    [organizerId, range],
  )

  const overviewQuery = useQuery({
    queryKey: analyticsKeys.overview(overviewQueryParams),
    queryFn: () => fetchDashboardOverview(overviewQueryParams),
    enabled: status !== 'loading' && canRequestAnalytics,
  })

  const overview = overviewQuery.data ?? null
  const stats = useMemo(
    () => (overview ? buildDashboardStats(overview) : []),
    [overview],
  )
  const activityItems = useMemo(
    () => (overview ? mapTopEventsToActivity(overview.topEvents) : []),
    [overview],
  )
  const isLoading = canRequestAnalytics && overviewQuery.isLoading
  const errorMessage = overviewQuery.error
    ? overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : 'The live analytics overview did not return data.'
    : null

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Dashboard"
        description="At-a-glance organizer overview from the Express analytics API"
      />

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load dashboard data</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {!canRequestAnalytics ? (
          <div className="md:col-span-2 xl:col-span-4">
            <EmptyScopedState />
          </div>
        ) : isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <StatCardSkeleton key={index} />
              ))
            : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <SectionCard title="Quick Actions">
        <QuickActions>
          {quickActions.map((action) => (
            <QuickAction key={action.label} {...action} />
          ))}
        </QuickActions>
      </SectionCard>

      <SectionCard
        title="Recent Activity"
        subtitle="Live top events from the selected range."
      >
        {!canRequestAnalytics ? (
          <EmptyScopedState />
        ) : isLoading ? (
          <ActivitySkeleton />
        ) : activityItems.length ? (
          <ActivityList items={activityItems} />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No live activity was returned by the analytics overview endpoint.
          </div>
        )}
      </SectionCard>
    </div>
  )
}
