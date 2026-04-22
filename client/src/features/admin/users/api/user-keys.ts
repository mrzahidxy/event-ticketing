const baseKey = ['admin-users'] as const

export const userKeys = {
  all: baseKey,
  list: (filters: unknown = {}) => [...baseKey, 'list', filters] as const,
  detail: (id: string) => [...baseKey, 'detail', id] as const,
}
