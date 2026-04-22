import type { AuthSessionPayload, AuthenticatedUser } from '@/types/auth'
import { createResettableStore } from '@/lib/store'

type AuthState = {
  accessToken: string | null
  accessTokenExpiresAt: string | null
  refreshTokenExpiresAt: string | null
  user: AuthenticatedUser | null
}

type AuthActions = {
  clearSession: () => void
  setAccessToken: (accessToken: string | null) => void
  setSession: (session: AuthSessionPayload) => void
  setUser: (user: AuthenticatedUser | null) => void
}

const initialState: AuthState = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  user: null,
}

export const useAuthStore = createResettableStore<AuthState, AuthActions>({
  initialState,
  createActions: ({ set }) => ({
    clearSession: () => set(initialState),
    setAccessToken: (accessToken) => set({ accessToken }),
    setSession: (session) =>
      set({
        accessToken: session.accessToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
        refreshTokenExpiresAt: session.refreshTokenExpiresAt,
        user: session.user,
      }),
    setUser: (user) => set({ user }),
  }),
})
