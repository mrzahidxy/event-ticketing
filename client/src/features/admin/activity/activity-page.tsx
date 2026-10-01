'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { listAdminAuditLogs } from '../api/admin-client'
import { Card, CardContent } from '../components/ui/card'

export function ActivityPage() {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: listAdminAuditLogs,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>Recent System Activity</h1>
          <p className="text-muted-foreground">
            Up to 25 recent entries reconstructed from organizer, booking, and payment records.
          </p>
        </div>
        <Link href="/admin/overview" className={buttonVariants({ variant: 'outline' })}>Back to overview</Link>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load activity</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
          <Button variant="outline" className="mt-3" onClick={() => void refetch()}>Retry</Button>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-6">
            {isLoading ? <p role="status">Loading activity...</p> : data.length ? (
              <div className="space-y-4">
                {data.map((entry) => (
                  <div key={entry.id} className="flex flex-col justify-between gap-2 border-b pb-4 last:border-0 last:pb-0 sm:flex-row">
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{entry.action}</p>
                        <Badge variant={entry.scope === 'System' ? 'default' : 'outline'}>{entry.scope}</Badge>
                      </div>
                      <p>{entry.target}</p>
                      {entry.details ? <p>{entry.details}</p> : null}
                      <p className="text-muted-foreground">By {entry.actor || 'system'}</p>
                    </div>
                    <time dateTime={entry.timestamp} className="text-xs text-muted-foreground sm:whitespace-nowrap">
                      {formatDateTime(entry.timestamp)}
                    </time>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No recent activity.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
