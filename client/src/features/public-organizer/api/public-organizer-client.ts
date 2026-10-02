import { apiClient } from '@/lib/api'
import {
  extractEntity,
  extractList,
  normalizeEvent,
  normalizeOrganizer,
  toNullableString,
  toNumberValue,
  toObject,
  toStringValue,
} from '@/lib/api/normalizers'
import type { UserOrganizerBookingInput } from '@/types/booking'
import type { Event, Organizer } from '@/types/domain'

export type PublicOrganizerPageData = {
  organizer: Organizer
  publishedEvents: Event[]
}

export type UserOrganizerCheckoutSession = {
  id: string
  url: string | null
  expiresAt: number | null
}

function normalizeUserOrganizerCheckoutSession(payload: unknown): UserOrganizerCheckoutSession {
  const record = toObject(payload)
  const expiresAt = toNumberValue(record?.expiresAt, Number.NaN)

  return {
    id: toStringValue(record?.id),
    url: toNullableString(record?.url),
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
  }
}

function normalizePublicOrganizerPageData(payload: unknown): PublicOrganizerPageData {
  const record = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}

  return {
    organizer: extractEntity(record, ['organizer'], normalizeOrganizer),
    publishedEvents: extractList(record, ['publishedEvents', 'events'], normalizeEvent),
  }
}

export async function getPublicOrganizersPage(): Promise<PublicOrganizerPageData[]> {
  const response = await apiClient.get<unknown>('/api/public/organizers', {
    cache: 'no-store',
  })

  return extractList(response, ['organizers', 'items', 'data'], normalizePublicOrganizerPageData)
}

export async function getPublicOrganizerPage(organizerId: string): Promise<PublicOrganizerPageData> {
  const response = await apiClient.get<unknown>(`/api/public/organizers/${organizerId}`, {
    cache: 'no-store',
  })

  return normalizePublicOrganizerPageData(response)
}

export async function createUserOrganizerBooking(
  organizerId: string,
  input: UserOrganizerBookingInput,
) {
  const successUrl = new URL('/user/bookings?checkout=success', window.location.origin).toString()
  const cancelUrl = new URL(
    `/organizers/${organizerId}?eventId=${encodeURIComponent(input.eventId)}#booking-form`,
    window.location.origin,
  ).toString()
  const response = await apiClient.post<unknown>(
    `/api/public/organizers/${organizerId}/bookings`,
    { ...input, successUrl, cancelUrl },
    {
      auth: true,
    },
  )

  return extractEntity(response, ['checkoutSession'], normalizeUserOrganizerCheckoutSession)
}
