'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/modal'
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
import type { BookingTicket } from '@/types/booking'

import {
  getUserBookingDetails,
  listUserBookingHistory,
} from './api/booking-history-client'

const PAGE_SIZE = 10

function getStatusVariant(status: string) {
  if (
    status === 'CONFIRMED' ||
    status === 'COMPLETED' ||
    status === 'ISSUED' ||
    status === 'CHECKED_IN'
  ) {
    return 'success' as const
  }

  if (status === 'CANCELLED' || status === 'VOIDED') {
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

function downloadTicket(
  ticket: BookingTicket,
  eventName: string,
  eventDate: string,
) {
  const qrCode = document.getElementById(`ticket-qr-${ticket.id}`)
  if (!qrCode) return

  const escapeXml = (value: string) =>
    value.replace(/[<>&"']/g, (character) => {
      const replacements: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      }
      return replacements[character]
    })
  const qrViewBox = qrCode.getAttribute('viewBox') ?? '0 0 112 112'
  const qrMarkup = `<svg x="616" y="92" width="176" height="176" viewBox="${qrViewBox}" shape-rendering="crispEdges">${qrCode.innerHTML}</svg>`
  const ticketSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="840" height="360" viewBox="0 0 840 360">
      <rect width="840" height="360" rx="20" fill="#fff" stroke="#cbd5e1" stroke-width="2" />
      <path d="M20 0h800a20 20 0 0 1 20 20v8H0v-8A20 20 0 0 1 20 0Z" fill="#0f766e" />
      <text x="40" y="66" fill="#0f766e" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2">ADMISSION TICKET</text>
      <text x="40" y="108" fill="#0f172a" font-family="Arial,sans-serif" font-size="26" font-weight="700">${escapeXml(eventName)}</text>
      <text x="40" y="148" fill="#64748b" font-family="Arial,sans-serif" font-size="13">${escapeXml(eventDate)}</text>
      <path d="M40 172h520" stroke="#e2e8f0" />
      <text x="40" y="208" fill="#64748b" font-family="Arial,sans-serif" font-size="12">ATTENDEE</text>
      <text x="40" y="232" fill="#0f172a" font-family="Arial,sans-serif" font-size="16" font-weight="700">${escapeXml(ticket.attendeeName || 'Ticket holder')}</text>
      <text x="40" y="270" fill="#64748b" font-family="Arial,sans-serif" font-size="12">TICKET CODE</text>
      <text x="40" y="294" fill="#0f172a" font-family="monospace" font-size="16" font-weight="700">${escapeXml(ticket.code)}</text>
      <text x="40" y="328" fill="#64748b" font-family="Arial,sans-serif" font-size="12">${escapeXml(ticket.status.replace('_', ' '))} - Issued ${escapeXml(formatDate(ticket.issuedAt))}</text>
      <path d="M590 52v256" stroke="#cbd5e1" stroke-dasharray="6 6" />
      <rect x="604" y="80" width="200" height="200" rx="12" fill="#fff" stroke="#e2e8f0" />
      ${qrMarkup}
      <text x="704" y="310" text-anchor="middle" fill="#64748b" font-family="Arial,sans-serif" font-size="12">SCAN AT ENTRY</text>
    </svg>`
  const url = URL.createObjectURL(
    new Blob([ticketSvg], { type: 'image/svg+xml;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `${ticket.code}.svg`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function UserBookingHistoryPage() {
  const [page, setPage] = useState(1)
  const [ticketBookingId, setTicketBookingId] = useState<number | null>(null)
  const [isCheckoutReturn, setIsCheckoutReturn] = useState(false)

  useEffect(() => {
    setIsCheckoutReturn(new URLSearchParams(window.location.search).get('checkout') === 'success')
  }, [])

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['user-booking-history', page, PAGE_SIZE],
    queryFn: () => listUserBookingHistory({ page, limit: PAGE_SIZE }),
  })

  const {
    data: ticketBooking,
    isLoading: isLoadingTickets,
    isError: isTicketError,
  } = useQuery({
    queryKey: ['user-booking-details', ticketBookingId],
    queryFn: () => getUserBookingDetails(ticketBookingId!),
    enabled: ticketBookingId !== null,
  })

  const rows = data?.data ?? []
  const meta = data?.meta
  const selectedBooking = rows.find(({ id }) => id === ticketBookingId)

  return (
    <div className="space-y-6">
      {isCheckoutReturn ? (
        <Alert>
          <AlertTitle>Payment processing</AlertTitle>
          <AlertDescription>
            Your booking status will update after payment is confirmed. Refresh this page to check for updates.
          </AlertDescription>
        </Alert>
      ) : null}

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
                      <TableHead>Tickets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium text-slate-900">
                          {booking.eventName || 'Untitled event'}
                        </TableCell>
                        <TableCell>
                          {booking.bookingDate
                            ? formatDate(booking.bookingDate)
                            : formatDate(booking.createdAt)}
                        </TableCell>
                        <TableCell>{booking.bookingTime || '-'}</TableCell>
                        <TableCell>{toPriceLabel(booking.totalPrice)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTicketBookingId(booking.id)}
                            >
                              View tickets
                            </Button>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          )}
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
      <Dialog
        open={ticketBookingId !== null}
        onOpenChange={(open) => {
          if (!open) setTicketBookingId(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedBooking?.eventName || 'Tickets'}</DialogTitle>
            <DialogDescription>Show your ticket QR code at the entrance.</DialogDescription>
          </DialogHeader>

          {isLoadingTickets ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : null}
          {isTicketError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not load tickets</AlertTitle>
              <AlertDescription>Please close this window and try again.</AlertDescription>
            </Alert>
          ) : null}
          {!isLoadingTickets && !isTicketError ? (
            ticketBooking?.tickets?.length ? (
              <div className="divide-y rounded-md border">
                {ticketBooking.tickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-medium">{ticket.code}</p>
                      <p className="text-sm text-slate-600">
                        {ticket.attendeeName || 'Ticket holder'}
                      </p>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {ticket.status === 'ISSUED' ? (
                      <div className="flex flex-col items-center gap-2 self-start sm:self-center">
                        <QRCodeSVG
                          id={`ticket-qr-${ticket.id}`}
                          value={ticket.qrPayload}
                          size={112}
                          title={`Ticket ${ticket.code}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadTicket(
                              ticket,
                              ticketBooking?.eventName || selectedBooking?.eventName || 'Event',
                              ticketBooking?.eventDate || selectedBooking?.eventDate
                                ? formatDate(ticketBooking?.eventDate || selectedBooking?.eventDate || '')
                                : 'Date to be announced',
                            )
                          }
                          aria-label={`Download ticket ${ticket.code}`}
                        >
                          <Download className="h-4 w-4" />
                          Download ticket
                        </Button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No tickets are available for this booking.
              </p>
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
