const baseKey = ['organizers'] as const

export const organizerKeys = {
  all: baseKey,
  detail: (organizerId: string) =>
    [...baseKey, 'detail', organizerId] as const,
  events: (organizerId: string) =>
    [...baseKey, 'events', organizerId] as const,
  ticketTiers: (organizerId: string, eventId: string) =>
    [...baseKey, 'events', organizerId, eventId, 'ticket-tiers'] as const,
  staff: (organizerId: string) => [...baseKey, 'staff', organizerId] as const,
  staffCandidates: (organizerId: string, search: string) =>
    [...baseKey, 'staff-candidates', organizerId, search] as const,
}
