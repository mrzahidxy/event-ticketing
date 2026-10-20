'use client'

import { useMemo } from 'react'
import { resolveOrganizerScopeId } from '@/features/business-owner/organizer-scope'
import { useQuery } from '@tanstack/react-query'
import { Activity, BadgeCheck, Receipt, Ticket, Wallet } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { normalizeUserRole } from '@/types/user'
import { DashboardHeader } from '../dashboard/components/dashboard-header'
import { SectionCard } from '../dashboard/components/section-card'
import { StatCard } from '../dashboard/components/stat-card'
import { fetchAnalyticsEvents } from './api/analytics-client'
import { analyticsKeys } from './api/analytics-keys'

const numberFormat = new Intl.NumberFormat('en-US')

function StatCardSkeleton() {
  return (
    <div className="flex min-h-28 flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-soft">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
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

function getRevenueByCurrency(
  rows: {
    currency: string | null
    estimatedRevenue: string
  }[],
) {
  const totals = new Map<string, number>()

  for (const row of rows) {
    if (!row.currency) continue
    totals.set(
      row.currency,
      (totals.get(row.currency) ?? 0) + Number(row.estimatedRevenue),
    )
  }

  return [...totals.entries()].sort(([currencyA], [currencyB]) =>
    currencyA.localeCompare(currencyB),
  )
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const organizerId = resolveOrganizerScopeId(session?.user ?? null)
  const role = normalizeUserRole(session?.user?.role)
  const canRequestAnalytics = role === 'ADMIN' || role === 'OWNER' || role === 'STAFF'
  const eventAnalyticsQuery = useQuery({
    queryKey: analyticsKeys.events(session?.user?.id, organizerId ?? undefined),
    queryFn: () => fetchAnalyticsEvents(organizerId ?? undefined),
    enabled: status === 'authenticated' && canRequestAnalytics,
    refetchInterval: 30_000,
  })

  const rows = eventAnalyticsQuery.data?.rows ?? []
  const totals = useMemo(
    () => ({
      bookings: rows.reduce((total, row) => total + row.totalBookings, 0),
      tickets: rows.reduce((total, row) => total + row.ticketsSold, 0),
      checkIns: rows.reduce((total, row) => total + row.checkIns, 0),
      revenueByCurrency: getRevenueByCurrency(rows),
      latestUpdate: rows.reduce<string | null>(
        (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
        null,
      ),
    }),
    [rows],
  )
  const topEvents = useMemo(
    () =>
      [...rows]
        .sort(
          (eventA, eventB) =>
            eventB.totalBookings - eventA.totalBookings ||
            eventB.ticketsSold - eventA.ticketsSold,
        )
        .slice(0, 5),
    [rows],
  )
  const isLoading = status === 'loading' || eventAnalyticsQuery.isLoading

  const stats = [
    {
      label: 'Bookings',
      value: numberFormat.format(totals.bookings),
      helper: 'All-time worker total',
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      label: 'Tickets sold',
      value: numberFormat.format(totals.tickets),
      helper: 'All-time worker total',
      icon: <Ticket className="h-5 w-5" />,
    },
    {
      label: 'Estimated revenue',
      value: totals.revenueByCurrency.length
        ? totals.revenueByCurrency
            .map(([currency, amount]) => formatCurrency(amount, currency))
            .join(' · ')
        : '—',
      helper: 'Booking value, grouped by currency',
      icon: <Wallet className="h-5 w-5" />,
      className: 'break-words',
    },
    {
      label: 'Check-ins',
      value: numberFormat.format(totals.checkIns),
      helper: 'All-time worker total',
      icon: <BadgeCheck className="h-5 w-5" />,
    },
  ]

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Analytics overview"
        description={
          totals.latestUpdate
            ? `All-time booking and check-in metrics projected from system events. Updated ${formatDateTime(totals.latestUpdate)}.`
            : 'All-time booking and check-in metrics projected from system events.'
        }
      />

      {eventAnalyticsQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load worker analytics</AlertTitle>
          <AlertDescription>
            {eventAnalyticsQuery.error instanceof Error
              ? eventAnalyticsQuery.error.message
              : 'The request failed.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {!canRequestAnalytics && status !== 'loading' ? (
        <Alert>
          <AlertTitle>Analytics unavailable</AlertTitle>
          <AlertDescription>
            This account does not have an organizer analytics scope.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !canRequestAnalytics
          ? Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
          : stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <SectionCard
        title="Ticketed events by bookings"
        subtitle="Top five ticketed event listings by all-time bookings"
        icon={<Activity className="h-5 w-5" />}
      >
        {isLoading ? (
          <div className="space-y-5" aria-label="Loading event activity">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-2 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : topEvents.length ? (
          <ol className="space-y-5">
            {topEvents.map((event) => {
              const maxBookings = topEvents[0]?.totalBookings ?? 0
              const width = maxBookings
                ? Math.max((event.totalBookings / maxBookings) * 100, 2)
                : 0

              return (
                <li key={`${event.organizerId}:${event.eventId}`}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="truncate font-medium text-slate-700">
                        {event.eventName || event.eventId}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {numberFormat.format(event.totalBookings)} bookings
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="meter"
                    aria-label={`${event.eventId} booking share`}
                    aria-valuemin={0}
                    aria-valuemax={maxBookings}
                    aria-valuenow={event.totalBookings}
                  >
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        ) : (
          <EmptyState message="No event activity has been processed yet." />
        )}
      </SectionCard>
    </div>
  )
}
