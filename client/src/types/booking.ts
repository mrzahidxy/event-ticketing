import type { PaymentRecord } from '@/types/domain'

export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED'

export type Booking = {
  id: number
  userId: string
  organizerId: string | null
  eventId: string | null
  eventName: string
  checkIn: string
  checkOut: string
  totalPrice: string
  status: BookingStatus
  notes: string
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  guestCount?: number
  bookingTime?: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name: string
  }
  payments: PaymentRecord[]
}

export type BookingInput = {
  eventId?: string
  checkIn: string
  checkOut: string
  totalPrice?: number
  notes?: string
}

export type PublicOrganizerBookingInput = {
  eventId: string
  ticketTierId: number
  bookingDate: string
  bookingTime: string
  quantity: number
  guestCount?: number
  fullName?: string
  email?: string
  phone?: string
  notes?: string
}

export type BookingUpdate = Partial<BookingInput> & {
  status?: BookingStatus
}

export type ResourceFilters = {
  search?: string
  status?: string
  page?: number
  limit?: number
  pageSize?: number
  sortBy?: 'eventName' | 'status' | 'totalPrice' | 'createdAt' | 'updatedAt'
  sortDirection?: 'asc' | 'desc'
  eventName?: string
  checkInDate?: string
  checkOutDate?: string
  checkInFrom?: string
  checkInTo?: string
  checkOutFrom?: string
  checkOutTo?: string
}

export type PaginatedResult<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}
