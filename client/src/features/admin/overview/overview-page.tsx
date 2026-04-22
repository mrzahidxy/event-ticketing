"use client";

import type { LucideIcon } from 'lucide-react'
import { Activity, Building2, CalendarRange, DollarSign, Receipt, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/features/admin/components/ui/card'
import { formatCompactNumber, formatCurrency, formatDateTime, formatRelativeDate } from '@/lib/format'
import { getAdminSystemOverview } from '@/features/admin/api/admin-client'

export function OverviewPage() {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-system-overview'],
    queryFn: getAdminSystemOverview,
  })

  const kpiData: Array<{
    title: string
    value: string
    icon: LucideIcon
    trend: string
  }> = [
    {
      title: 'Total Organizers',
      value: formatCompactNumber(data?.metrics.totalOrganizers ?? 0),
      icon: Building2,
      trend: `${data?.status.suspendedOrganizers ?? 0} suspended`,
    },
    {
      title: 'Active Users',
      value: formatCompactNumber(data?.metrics.activeUsers ?? 0),
      icon: Users,
      trend: data?.highlights.activeUsersLabel || 'No user activity yet',
    },
    {
      title: 'Published Events',
      value: formatCompactNumber(data?.metrics.publishedEvents ?? 0),
      icon: CalendarRange,
      trend: `${data?.metrics.totalBookings ?? 0} total bookings`,
    },
    {
      title: 'Total Bookings',
      value: formatCompactNumber(data?.metrics.totalBookings ?? 0),
      icon: Receipt,
      trend: `${data?.status.pendingBookings ?? 0} pending`,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(data?.metrics.totalRevenue ?? 0),
      icon: DollarSign,
      trend: data?.highlights.totalRevenueLabel || formatCurrency(0),
    },
  ]

  const activitySeries =
    data?.activitySeries.map((entry) => ({
      date: entry.date,
      calls: entry.count,
    })) ?? []

  const recentActivity = data?.recentActivity ?? []

  function renderTimestamp(value: string) {
    try {
      return formatDateTime(value)
    } catch {
      return value || '—'
    }
  }

  function renderRelativeTimestamp(value: string) {
    try {
      return formatRelativeDate(value)
    } catch {
      return value || '—'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Dashboard Overview</h1>
          <p className="text-muted-foreground">Platform-wide metrics and booking system status</p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load system overview</AlertTitle>
          <AlertDescription>
            The admin dashboard now depends on the backend admin endpoints. Check your admin
            session and API availability, then reload the page.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-muted-foreground">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[1.5rem]">
                  {isLoading ? <span className="text-base text-muted-foreground">Loading...</span> : kpi.value}
                </div>
                <p className="text-xs text-muted-foreground">{kpi.trend}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>System Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Loading activity series...
              </div>
            ) : activitySeries.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={activitySeries}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0E7C86" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0E7C86" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Area type="monotone" dataKey="calls" stroke="#0E7C86" fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No system activity was returned by the admin overview endpoint.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm">Latest activity</p>
                <p className="text-xs text-muted-foreground">
                  {data?.highlights.latestActivityLabel ?? 'No recent activity'}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Suspended organizers</span>
                <span className="text-muted-foreground">
                  {data?.status.suspendedOrganizers ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pending bookings</span>
                <span className="text-muted-foreground">{data?.status.pendingBookings ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending payments</span>
                <span className="text-muted-foreground">{data?.status.pendingPayments ?? 0}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium">Backend Source</p>
              <p className="text-xs text-muted-foreground">
                Loaded from `/admin/system/overview` with your admin bearer token.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent System Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-4 text-sm text-muted-foreground">Loading recent activity...</div>
            ) : recentActivity.length ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm">{activity.action}</p>
                      <Badge variant={activity.scope === 'System' ? 'default' : 'outline'}>
                        {activity.scope}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{activity.target}</p>
                    {activity.details ? (
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">By {activity.actor || 'system'}</p>
                  </div>
                  <div className="text-right">
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      {renderRelativeTimestamp(activity.timestamp)}
                    </span>
                    <span className="block whitespace-nowrap text-xs text-muted-foreground">
                      {renderTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-sm text-muted-foreground">
                No recent activity was returned by the admin overview endpoint.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
