import type { ResourceFilters } from '@/types/booking'

const baseKey = ['bookings'] as const

export const resourceKeys = {
  all: baseKey,
  list: (filters: Partial<ResourceFilters>) => [...baseKey, filters] as const,
  detail: (id: string | number) => [...baseKey, 'detail', id] as const,
}
