'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { HttpError } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { getBookingById } from './api/booking-client'
import { resourceKeys } from './api/booking-keys'
import { BookingForm } from './components/booking-form'

function getBookingLoadErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again to view booking details.'
    }

    if (error.status === 403) {
      return 'You do not have permission to view this booking.'
    }
  }

  return 'Failed to load booking data'
}

type BookingDetailPageProps = {
  bookingId?: string
}

export default function BookingDetailPage({ bookingId: bookingIdProp }: BookingDetailPageProps = {}) {
  const params = useParams<{ bookingId?: string }>()
  const bookingId = bookingIdProp ?? params?.bookingId
  const resolvedBookingId = bookingId ?? ''
  const hasShownError = useRef(false)

  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: resourceKeys.detail(resolvedBookingId),
    queryFn: () => getBookingById(resolvedBookingId),
    enabled: Boolean(bookingId),
  })

  useEffect(() => {
    if (
      !isLoading &&
      (error || !booking) &&
      !hasShownError.current
    ) {
      toast.error(getBookingLoadErrorMessage(error))
      hasShownError.current = true
    }
  }, [isLoading, error, booking])

  useEffect(() => {
    if (!isLoading && booking) {
      hasShownError.current = false
    }
  }, [isLoading, booking])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-slate-500"
          aria-label="Loading..."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {booking?.eventName ?? 'Booking'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {booking ? (
                <>
                  Status:{' '}
                  <span className="font-medium text-slate-200">
                    {booking.status}
                  </span>{' '}
                  - Last updated {formatDate(booking.updatedAt)}
                </>
              ) : (
                'Booking details unavailable.'
              )}
            </p>
          </div>
        </div>
      </div>

      <BookingForm
        mode="edit"
        defaultValues={
          booking
            ? {
                status: booking.status,
              }
            : undefined
        }
        bookingId={booking?.id?.toString() ?? (bookingId ?? '')}
      />
    </div>
  )
}
