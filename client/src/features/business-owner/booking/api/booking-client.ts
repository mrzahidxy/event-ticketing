'use client'

import { apiClient } from '@/lib/api'
import {
  extractEntity,
  normalizeBooking,
  normalizePaginatedBookings,
} from '@/lib/api/normalizers'
import type {
  Booking,
  BookingStatus,
  PaginatedResult,
  ResourceFilters,
} from '@/types/booking'

export type ListBookingsParams = {
  checkInFrom?: string
  checkInTo?: string
  checkOutFrom?: string
  checkOutTo?: string
  eventName?: string
  limit?: number
  page?: number
  status?: BookingStatus | BookingStatus[]
}

export type CreateBookingRequest = {
  checkIn: string
  checkOut: string
  eventId: string
  quantity: number
  ticketTierId: number
}

export type UpdateBookingRequest = {
  checkIn?: string
  checkOut?: string
  status?: BookingStatus
}

function normalizeBookingFilters(filters: ListBookingsParams = {}) {
  return {
    checkInFrom: filters.checkInFrom,
    checkInTo: filters.checkInTo,
    checkOutFrom: filters.checkOutFrom,
    checkOutTo: filters.checkOutTo,
    eventName: filters.eventName,
    limit: filters.limit,
    page: filters.page,
    status: Array.isArray(filters.status)
      ? filters.status
      : filters.status
        ? [filters.status]
        : undefined,
  }
}

export async function listBookings(
  filters: ListBookingsParams = {},
): Promise<PaginatedResult<Booking>> {
  const response = await apiClient.get<unknown>('/api/bookings', {
    auth: true,
    cache: 'no-store',
    query: normalizeBookingFilters(filters),
  })

  return normalizePaginatedBookings(response)
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

export async function createBookingRequest(input: CreateBookingRequest | unknown) {
  const response = await apiClient.post<unknown>(
    '/api/bookings',
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['resource', 'booking'], normalizeBooking)
}

export async function updateBooking(
  id: string | number,
  input: UpdateBookingRequest,
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
