'use client'

import { ReactNode, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider, useSession } from 'next-auth/react'

import { ThemeProvider } from '@/components/providers/theme-provider'
import { queryClientConfig } from '@/config/query'
import { logoutForExpiredSession } from '@/lib/session-expiry'
import { useAuthStore } from '@/stores/auth-store'
import { Toaster } from '@/components/ui/sonner-toaster'

type AppProviderProps = {
  children: ReactNode
}

function SessionStoreSync() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      useAuthStore.getState().clearSession()
      return
    }

    if (!session?.accessToken || !session.user?.email) {
      return
    }

    useAuthStore.getState().setSession({
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt ?? '',
      refreshTokenExpiresAt: '',
      user: {
        createdAt: '',
        email: session.user.email,
        id: session.user.id,
        name: session.user.name ?? session.user.email,
        permissions: session.user.permissions ?? [],
        organizerId: session.user.organizerId ?? null,
        role: session.user.role,
        status: session.user.status ?? 'ACTIVE',
        updatedAt: '',
      },
    })
  }, [session, status])

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const expiresAtRaw = session?.accessTokenExpiresAt
    if (!expiresAtRaw) {
      return
    }

    const expiresAt = new Date(expiresAtRaw).getTime()
    if (Number.isNaN(expiresAt)) {
      return
    }

    const timeoutMs = expiresAt - Date.now()

    if (timeoutMs <= 0) {
      void logoutForExpiredSession()
      return
    }

    const timer = window.setTimeout(() => {
      void logoutForExpiredSession()
    }, timeoutMs)

    return () => window.clearTimeout(timer)
  }, [session?.accessTokenExpiresAt, status])

  return null
}

export function AppProvider({ children }: AppProviderProps) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionStoreSync />
          <ThemeProvider>
            {children}
            <Toaster />
          {process.env.NODE_ENV === 'development' ? (
            <ReactQueryDevtools initialIsOpen={false} />
          ) : null}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
