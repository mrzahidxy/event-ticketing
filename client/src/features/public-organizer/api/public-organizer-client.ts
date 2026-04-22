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

export async function getPublicOrganizerPage(organizerId: string): Promise<PublicOrganizerPageData> {
  const response = await apiClient.get<unknown>(`/api/public/organizers/${organizerId}`, {
    cache: 'no-store',
  })

  return {
    organizer: extractEntity(response, ['organizer'], normalizeOrganizer),
    publishedEvents: extractList(response, ['publishedEvents', 'events'], normalizeEvent),
  }
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
