import { apiClient } from '@/lib/api'
import {
  extractEntity,
  extractList,
  normalizeBooking,
  normalizeEvent,
  normalizeOrganizer,
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
  const response = await apiClient.post<unknown>(
    `/api/public/organizers/${organizerId}/bookings`,
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['booking'], normalizeBooking)
}
