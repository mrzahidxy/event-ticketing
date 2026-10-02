'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { HttpError } from '@/lib/errors'
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

type BookingUpdatePanelProps = {
  bookingId: string
}

export default function BookingUpdatePanel({ bookingId }: BookingUpdatePanelProps) {
  const hasShownError = useRef(false)

  const {
    data: booking,
    isLoading,
    error,
  } = useQuery({
    queryKey: resourceKeys.detail(bookingId),
    queryFn: () => getBookingById(bookingId),
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
      <div className="flex h-36 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-slate-500"
          aria-label="Loading..."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">
          Update booking
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {booking?.eventName ?? 'Booking'}
          {booking ? ` | Current status: ${booking.status.toLowerCase()}` : ''}
        </p>
      </div>
      {booking ? (
          <BookingForm
            defaultValues={{ status: booking.status }}
            bookingId={booking.id.toString()}
          />
      ) : (
        <p className="text-sm text-slate-500">Booking details unavailable.</p>
      )}
    </div>
  )
}
