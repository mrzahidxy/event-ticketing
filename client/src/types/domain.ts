import type { UserPermission } from '@/types/user'

export type Organizer = {
  id: string
  name: string
  ownerId: string
  staffIds: string[]
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
}

export type TicketTier = {
  id: number
  eventId: string
  name: string
  description: string | null
  price: number
  currency: string
  quantityTotal: number | null
  quantitySold: number
  salesStartAt: string | null
  salesEndAt: string | null
  isActive: boolean
}

export type Event = {
  id: string
  organizerId: string
  name: string
  description: string
  price: number
  ticketTiers: TicketTier[]
  eventDate?: string
  eventTime?: string
  location?: string
  capacity?: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PAID'

export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'MANUAL'

export type PaymentRecord = {
  id: string
  bookingId: number
  userId: string
  organizerId: string | null
  method: PaymentMethod
  provider: 'STRIPE' | 'MANUAL'
  externalId: string
  status: PaymentStatus
  amount: number
  currency: string
  metadata?: Record<string, string>
  createdAt: string
  updatedAt: string
}

export type ActivityRecord = {
  id: string
  type: string
  title: string
  data?: Record<string, unknown>
  createdAt: string
}

export type AuthSession = {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  refreshExpiresAt: string
  createdAt: string
  updatedAt: string
}

export type UploadRecord = {
  id: string
  fileName: string
  contentType: string
  size: number
  uploadedBy: string
  uploadedAt: string
  url: string
}

export type RbacRoleDefinition = {
  role: string
  description: string
  permissions: UserPermission[]
}
