import type { QueryClientConfig } from '@tanstack/react-query'

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
}
