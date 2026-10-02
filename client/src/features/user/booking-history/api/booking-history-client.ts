'use client'

import { apiClient } from '@/lib/api'
import { extractEntity, normalizeBooking, normalizePaginatedBookings } from '@/lib/api/normalizers'
import type { Booking, PaginatedResult } from '@/types/booking'

export type UserBookingHistoryParams = {
  page?: number
  limit?: number
}

export async function listUserBookingHistory(
  params: UserBookingHistoryParams = {},
): Promise<PaginatedResult<Booking>> {
  const response = await apiClient.get<unknown>('/api/bookings/history', {
    auth: true,
    cache: 'no-store',
    query: {
      page: params.page,
      limit: params.limit,
    },
  })

  return normalizePaginatedBookings(response)
}

export async function getUserBookingDetails(id: number): Promise<Booking> {
  const response = await apiClient.get<unknown>(`/api/bookings/${id}`, {
    auth: true,
    cache: 'no-store',
  })

  return extractEntity(response, ['booking'], normalizeBooking)
}
