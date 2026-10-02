'use client'

import { apiClient } from '@/lib/api'
import {
  extractEntity,
  normalizeBooking,
  normalizePaginatedBookings,
} from '@/lib/api/normalizers'
import type {
  Booking,
  PaginatedResult,
  ResourceFilters,
} from '@/types/booking'

export type UpdateBookingRequest = {
  checkIn?: string
  checkOut?: string
  status?: BookingStatus
}

export async function fetchBookings(
  filters: Partial<ResourceFilters>,
): Promise<PaginatedResult<Booking>> {
  const response = await apiClient.get<unknown>('/api/bookings', {
    auth: true,
    cache: 'no-store',
    query: {
      eventName: filters.eventName,
      limit: filters.limit ?? filters.pageSize,
      page: filters.page,
      search: filters.search,
      status: filters.status,
      checkInFrom: filters.checkInDate ?? filters.checkInFrom,
      checkInTo: filters.checkInDate ?? filters.checkInTo,
      checkOutFrom: filters.checkOutDate ?? filters.checkOutFrom,
      checkOutTo: filters.checkOutDate ?? filters.checkOutTo,
    },
  })

  return normalizePaginatedBookings(response)
}

export async function updateBookingRequest(
  id: string,
  input: UpdateBookingRequest | unknown,
) {
  const response = await apiClient.patch<unknown>(
    `/api/bookings/${id}`,
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['resource', 'booking'], normalizeBooking)
}

export async function deleteBooking(id: number | string) {
  await apiClient.delete<unknown>(`/api/bookings/${id}`, {
    auth: true,
  })
}

export async function getBookingById(id: string | number) {
  const response = await apiClient.get<unknown>(`/api/bookings/${id}`, {
    auth: true,
    cache: 'no-store',
  })

  return extractEntity(response, ['booking'], normalizeBooking)
}
