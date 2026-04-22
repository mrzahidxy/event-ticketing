'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

import { listUserBookingHistory } from './api/booking-history-client'

const PAGE_SIZE = 10

function getStatusVariant(status: string) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') {
    return 'success' as const
  }

  if (status === 'CANCELLED') {
    return 'destructive' as const
  }

  return 'warning' as const
}

function toPriceLabel(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return value
  }

  return formatCurrency(parsed)
}

export function UserBookingHistoryPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['user-booking-history', page, PAGE_SIZE],
    queryFn: () => listUserBookingHistory({ page, limit: PAGE_SIZE }),
  })

  const rows = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Booking History</CardTitle>
          <CardDescription>
            View your recent bookings with simple details and status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : null}

          {isError ? (
            <Alert variant="destructive">
              <AlertTitle>Failed to load booking history</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Something went wrong while loading data.'}
              </AlertDescription>
            </Alert>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium text-slate-900">
                          {booking.eventName || 'Untitled event'}
                        </TableCell>
                        <TableCell>
                          {booking.checkIn && booking.checkOut
                            ? `${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)}`
                            : formatDate(booking.createdAt)}
                        </TableCell>
                        <TableCell>{booking.bookingTime || '-'}</TableCell>
                        <TableCell>{toPriceLabel(booking.totalPrice)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {rows.length === 0 ? (
                <Alert>
                  <AlertTitle>No bookings yet</AlertTitle>
                  <AlertDescription>
                    When you book an event, it will appear here.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Page {meta?.page ?? page}
                  {meta?.totalPages ? ` of ${meta.totalPages}` : ''}
                  {meta?.totalItems !== undefined ? ` • ${meta.totalItems} total bookings` : ''}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page <= 1 || isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={Boolean(meta?.totalPages && page >= meta.totalPages) || isFetching}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
