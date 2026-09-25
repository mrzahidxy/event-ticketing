import { apiClient } from '@/lib/api'
import {
  extractEntity,
  extractList,
  normalizeBooking,
  normalizeEvent,
  normalizeOrganizer,
  toObject,
  unwrapData,
} from '@/lib/api/normalizers'
import type { PublicOrganizerBookingInput } from '@/types/booking'
import type { Event, Organizer } from '@/types/domain'

export type PublicOrganizerPageData = {
  organizer: Organizer
  publishedEvents: Event[]
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

export async function createPublicOrganizerBooking(
  organizerId: string,
  input: PublicOrganizerBookingInput,
) {
  const returnUrl = new URL('/user/bookings', window.location.origin).toString()
  const response = await apiClient.post<unknown>(
    `/api/public/organizers/${organizerId}/bookings`,
    {
      ...input,
      successUrl: returnUrl,
      cancelUrl: returnUrl,
    },
    {
      auth: true,
    },
  )

  const checkoutSession = toObject(toObject(unwrapData(response))?.checkoutSession)
  const checkoutUrl = checkoutSession?.url

  if (typeof checkoutUrl !== 'string' || !checkoutUrl) {
    throw new Error('Stripe did not return a checkout URL')
  }

  return {
    booking: extractEntity(response, ['booking'], normalizeBooking),
    checkoutUrl,
  }
}
