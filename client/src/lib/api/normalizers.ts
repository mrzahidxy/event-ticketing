import type { Booking, PaginatedResult } from '@/types/booking'
import type {
  Event,
  Organizer,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  RbacRoleDefinition,
  UploadRecord,
} from '@/types/domain'
import type { UserPermission } from '@/types/user'

type UserLikeRecord = {
  createdAt: string
  email: string
  id: string
  name?: string | null
  permissions?: string[]
  organizerId?: string | null
  role: string
  status: string
  updatedAt: string
}

const LIST_KEYS = [
  'items',
  'results',
  'bookings',
  'users',
  'organizers',
  'events',
  'publishedEvents',
  'payments',
  'roles',
  'staff',
  'definitions',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function unwrapData<T = unknown>(payload: unknown): T | null {
  if (isRecord(payload) && payload.data !== undefined) {
    return payload.data as T
  }

  return (payload as T) ?? null
}

export function toObject(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null
  }

  return payload
}

export function toArray<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  const record = toObject(payload)

  if (!record) {
    return []
  }

  if (Array.isArray(record.data)) {
    return record.data as T[]
  }

  for (const key of LIST_KEYS) {
    if (Array.isArray(record[key])) {
      return record[key] as T[]
    }
  }

  return []
}

export function toStringValue(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

export function toNullableString(value: unknown) {
  const resolved = toStringValue(value)
  return resolved || null
}

export function toNumberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

export function toBooleanValue(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value > 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true' || normalized === '1') {
      return true
    }

    if (normalized === 'false' || normalized === '0') {
      return false
    }
  }

  return fallback
}

export function normalizeUserLike(payload: unknown): UserLikeRecord {
  const record = toObject(payload)
  const organizer = toObject(record?.organizer)

  return {
    createdAt: toStringValue(record?.createdAt),
    email: toStringValue(record?.email),
    id: toStringValue(record?.id),
    name: toNullableString(record?.name),
    permissions: toArray(record?.permissions).map((value) => toStringValue(value)),
    organizerId: toNullableString(record?.organizerId ?? organizer?.id),
    role: toStringValue(record?.role, 'USER').toUpperCase(),
    status: toStringValue(record?.status, 'ACTIVE').toUpperCase(),
    updatedAt: toStringValue(record?.updatedAt),
  }
}

export function extractEntity<T>(
  payload: unknown,
  keys: string[],
  normalizer: (value: unknown) => T,
): T {
  const records = [toObject(payload), toObject(unwrapData(payload))].filter(
    (record): record is Record<string, unknown> => Boolean(record),
  )

  for (const record of records) {
    for (const key of keys) {
      if (record[key] !== undefined) {
        return normalizer(record[key])
      }
    }
  }

  return normalizer(unwrapData(payload) ?? payload)
}

export function extractList<T>(
  payload: unknown,
  keys: string[],
  normalizer: (value: unknown) => T,
): T[] {
  const record = toObject(unwrapData(payload) ?? payload)

  if (!record) {
    return toArray(payload).map(normalizer)
  }

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[]).map(normalizer)
    }
  }

  return toArray(record).map(normalizer)
}

export function normalizePaginationMeta(
  payload: unknown,
  itemCount: number,
  fallbackPage = 1,
  fallbackLimit = itemCount || 10,
) {
  const root = toObject(payload) ?? {}
  const meta =
    toObject(root.meta) ??
    toObject(root.pagination) ??
    toObject(root.pageInfo) ??
    {}
  const page = toNumberValue(root.page ?? meta.page, fallbackPage)
  const limit = toNumberValue(
    root.limit ?? root.pageSize ?? meta.limit ?? meta.pageSize,
    fallbackLimit,
  )
  const totalItems = toNumberValue(
    root.total ??
      root.totalItems ??
      meta.total ??
      meta.totalItems ??
      meta.totalCount,
    itemCount,
  )
  const totalPages = toNumberValue(
    root.totalPages ?? meta.totalPages,
    Math.max(1, Math.ceil(totalItems / Math.max(limit, 1))),
  )

  return {
    limit,
    page,
    totalItems,
    totalPages,
  }
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const normalized = toStringValue(value, 'PENDING').toUpperCase()

  if (
    normalized === 'SUCCEEDED' ||
    normalized === 'FAILED' ||
    normalized === 'REFUNDED' ||
    normalized === 'PAID'
  ) {
    return normalized
  }

  return 'PENDING'
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const normalized = toStringValue(value, 'CARD').toUpperCase()

  if (normalized === 'BANK_TRANSFER' || normalized === 'MANUAL') {
    return normalized
  }

  return 'CARD'
}

function normalizeBookingStatus(value: unknown): Booking['status'] {
  const normalized = toStringValue(value, 'PENDING').toUpperCase()

  if (
    normalized === 'CONFIRMED' ||
    normalized === 'CANCELLED' ||
    normalized === 'COMPLETED'
  ) {
    return normalized
  }

  return 'PENDING'
}

export function normalizePaymentRecord(payload: unknown): PaymentRecord {
  const record = toObject(payload)

  return {
    amount: toNumberValue(record?.amount),
    bookingId: toNumberValue(record?.bookingId),
    createdAt: toStringValue(record?.createdAt),
    currency: toStringValue(record?.currency, 'USD'),
    externalId: toStringValue(
      record?.externalId ?? record?.providerPaymentId ?? record?.sessionId,
    ),
    id: toStringValue(record?.id),
    metadata: isRecord(record?.metadata)
      ? Object.fromEntries(
          Object.entries(record.metadata).map(([key, value]) => [
            key,
            toStringValue(value),
          ]),
        )
      : undefined,
    method: normalizePaymentMethod(record?.method ?? record?.paymentMethod),
    organizerId: toNullableString(record?.organizerId),
    provider: toStringValue(record?.provider, 'MANUAL').toUpperCase() === 'STRIPE'
      ? 'STRIPE'
      : 'MANUAL',
    status: normalizePaymentStatus(record?.status),
    updatedAt: toStringValue(record?.updatedAt),
    userId: toStringValue(record?.userId),
  }
}

export function normalizeBooking(payload: unknown): Booking {
  const record = toObject(payload)
  const event = toObject(record?.event)
  const organizer = toObject(record?.organizer)
  const user = toObject(record?.user) ?? toObject(record?.customer) ?? {}
  const eventName = toStringValue(
    record?.eventName ?? event?.name ?? organizer?.name,
    'Untitled event',
  )

  return {
    bookingTime: toStringValue(record?.bookingTime) || undefined,
    checkIn: toStringValue(record?.checkIn ?? record?.bookingDate),
    checkOut: toStringValue(record?.checkOut ?? record?.bookingDate),
    createdAt: toStringValue(record?.createdAt),
    eventId: toNullableString(record?.eventId ?? event?.id),
    eventName,
    guestCount: toNumberValue(record?.guestCount, 0) || undefined,
    guestEmail: toStringValue(record?.guestEmail ?? record?.email) || undefined,
    guestName: toStringValue(record?.guestName ?? record?.fullName) || undefined,
    guestPhone: toStringValue(record?.guestPhone ?? record?.phone) || undefined,
    id: toNumberValue(record?.id),
    notes: toStringValue(record?.notes),
    organizerId: toNullableString(record?.organizerId ?? organizer?.id),
    payments: extractList(record?.payments, ['payments'], normalizePaymentRecord),
    status: normalizeBookingStatus(record?.status),
    totalPrice: toStringValue(
      record?.totalPrice ??
        record?.amount ??
        record?.total ??
        event?.price,
      '0',
    ),
    updatedAt: toStringValue(record?.updatedAt),
    user: {
      email: toStringValue(user.email),
      id: toStringValue(user.id),
      name: toStringValue(user.name, toStringValue(record?.guestName ?? record?.fullName)),
    },
    userId: toStringValue(record?.userId ?? user.id),
  }
}

export function normalizePaginatedBookings(
  payload: unknown,
): PaginatedResult<Booking> {
  const root = unwrapData(payload) ?? payload
  const record = toObject(root)
  const bookings = extractList(
    root,
    ['bookings', 'items', 'results', 'data'],
    normalizeBooking,
  )

  return {
    data: bookings,
    meta: normalizePaginationMeta(record, bookings.length),
  }
}

export function normalizeOrganizer(payload: unknown): Organizer {
  const record = toObject(payload)

  return {
    createdAt: toStringValue(record?.createdAt),
    id: toStringValue(record?.id),
    name: toStringValue(record?.name),
    ownerId: toStringValue(record?.ownerId ?? toObject(record?.owner)?.id),
    staffIds: extractList(record?.staffIds ?? record?.staff, ['staff'], (value) => {
      if (isRecord(value)) {
        return toStringValue(value.id)
      }

      return toStringValue(value)
    }),
    status: toStringValue(record?.status, 'ACTIVE').toUpperCase() === 'SUSPENDED'
      ? 'SUSPENDED'
      : 'ACTIVE',
    updatedAt: toStringValue(record?.updatedAt),
  }
}

export function normalizeEvent(payload: unknown): Event {
  const record = toObject(payload)

  return {
    capacity: record?.capacity === undefined ? undefined : toNumberValue(record?.capacity),
    createdAt: toStringValue(record?.createdAt),
    description: toStringValue(record?.description),
    eventDate: toStringValue(record?.eventDate) || undefined,
    eventTime: toStringValue(record?.eventTime) || undefined,
    id: toStringValue(record?.id),
    isPublished: toBooleanValue(record?.isPublished),
    location: toStringValue(record?.location) || undefined,
    name: toStringValue(record?.name),
    organizerId: toStringValue(record?.organizerId),
    price: toNumberValue(record?.price),
    updatedAt: toStringValue(record?.updatedAt),
  }
}

export function normalizeUploadRecord(payload: unknown): UploadRecord {
  const record = toObject(payload)

  return {
    contentType: toStringValue(record?.contentType ?? record?.mimeType),
    fileName: toStringValue(record?.fileName ?? record?.name),
    id: toStringValue(record?.id),
    size: toNumberValue(record?.size),
    uploadedAt: toStringValue(record?.uploadedAt ?? record?.createdAt),
    uploadedBy: toStringValue(record?.uploadedBy ?? record?.userId),
    url: toStringValue(record?.url),
  }
}

export function normalizeRbacRoleDefinitions(payload: unknown): RbacRoleDefinition[] {
  const root = unwrapData(payload) ?? payload
  const arrayPayload = extractList(root, ['roles', 'definitions'], (value) => value)

  if (arrayPayload.length) {
    return arrayPayload.map((entry) => {
      const record = toObject(entry)

      return {
        description: toStringValue(record?.description, 'No description available'),
        permissions: extractList(
          record?.permissions,
          ['permissions'],
          (permission) => toStringValue(permission) as UserPermission,
        ),
        role: toStringValue(record?.role),
      }
    })
  }

  const record = toObject(root)

  if (!record) {
    return []
  }

  return Object.entries(record).map(([role, permissions]) => ({
    description: `${role} permissions`,
    permissions: toArray(permissions).map(
      (permission) => toStringValue(permission) as UserPermission,
    ),
    role,
  }))
}
