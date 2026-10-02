import type { PaymentRecord } from '@/types/domain'

export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED'

export type BookingTicket = {
  id: string
  code: string
  qrPayload: string
  attendeeName: string | null
  attendeeEmail: string | null
  status: 'ISSUED' | 'CHECKED_IN' | 'VOIDED' | 'CANCELLED'
  issuedAt: string
  checkedInAt: string | null
  voidedAt: string | null
  ticketTierId: number
}

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
  tickets?: BookingTicket[]
}

export type BookingInput = {
  eventId?: string
  checkIn: string
  checkOut: string
  quantity: number
  ticketTierId: number
  totalPrice?: number
  notes?: string
}

export type UserOrganizerBookingInput = {
  eventId: string
  ticketTierId: number
  bookingDate: string
  bookingTime: string
  quantity: number
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
