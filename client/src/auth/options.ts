import { getOptionalOAuthProviders } from '@/auth/providers'
import { authRoutes } from '@/auth/routes'
import { env } from '@/config/env'
import { loginSchema } from '@/validation/auth-schema'
import type { NextAuthConfig, User } from 'next-auth'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import {
  loginWithBackend,
  logoutFromBackend,
  refreshBackendSession,
} from '@/lib/backend-auth'
import type { UserRole } from '@/types/user'

const credentialProvider = Credentials({
  name: 'Email and Password',
  async authorize(rawCredentials, _request): Promise<User | null> {
    const parsed = loginSchema.safeParse({
      email: rawCredentials.email,
      password: rawCredentials.password,
    })

    if (!parsed.success) {
      return null
    }

    try {
      const result = await loginWithBackend(parsed.data)
      const user: User = {
        id: String(result.user.id),
        email: result.user.email,
        name: result.user.name ?? result.user.email,
        role: result.user.role as UserRole,
        organizerId: result.user.organizerId ?? undefined,
        permissions: result.user.permissions,
        status: result.user.status ?? undefined,
        token: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        refreshToken: result.refreshCookie?.value,
        refreshTokenCookieName: result.refreshCookie?.name,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt,
      }

      return user
    } catch {
      return null
    }
  },
})

const secret = env.NEXTAUTH_SECRET

const authConfig: NextAuthConfig = {
  secret,
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  providers: [credentialProvider, ...getOptionalOAuthProviders()],
  pages: {
    signIn: authRoutes.signInPath,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = String(user.id)
        token.sub = String(user.id)
        token.name = user.name
        token.email = user.email

        if (user.role) token.role = user.role as UserRole
        token.organizerId = user.organizerId ?? undefined
        if (user.permissions) token.permissions = user.permissions
        if (user.status) token.status = user.status
        if (user.token) token.accessToken = user.token
        if (user.accessTokenExpiresAt)
          token.accessTokenExpiresAt = user.accessTokenExpiresAt
        if (user.refreshToken) token.refreshToken = user.refreshToken
        if (user.refreshTokenCookieName)
          token.refreshTokenCookieName = user.refreshTokenCookieName
        if (user.refreshTokenExpiresAt)
          token.refreshTokenExpiresAt = user.refreshTokenExpiresAt
      }

      if (!token.accessToken || !token.accessTokenExpiresAt) {
        return token
      }

      const expiresAt = new Date(token.accessTokenExpiresAt as string).getTime()

      if (Number.isNaN(expiresAt) || Date.now() < expiresAt - 60_000) {
        return token
      }

      try {
        const refreshed = await refreshBackendSession({
          accessToken: token.accessToken as string,
          refreshCookie:
            token.refreshToken && token.refreshTokenCookieName
              ? {
                  name: token.refreshTokenCookieName as string,
                  value: token.refreshToken as string,
                }
              : null,
        })

        token.accessToken = refreshed.accessToken
        token.accessTokenExpiresAt = refreshed.accessTokenExpiresAt
        token.refreshTokenExpiresAt = refreshed.refreshTokenExpiresAt
        token.name = refreshed.user.name ?? token.name
        token.email = refreshed.user.email ?? token.email
        if (refreshed.user.role) {
          token.role = refreshed.user.role as UserRole
        }
        token.organizerId = refreshed.user.organizerId ?? undefined
        token.permissions = refreshed.user.permissions ?? token.permissions
        token.status = refreshed.user.status ?? token.status
        if (refreshed.refreshCookie) {
          token.refreshToken = refreshed.refreshCookie.value
          token.refreshTokenCookieName = refreshed.refreshCookie.name
        }

        return token
      } catch {
        return null
      }
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? session.user.id
      session.user.name = token.name ?? session.user.name
      session.user.email = token.email ?? session.user.email

      if (token.role) session.user.role = token.role as UserRole
      if (token.organizerId) {
        session.user.organizerId = token.organizerId as string
      } else {
        delete session.user.organizerId
      }
      if (token.permissions) session.user.permissions = token.permissions as string[]
      if (token.status) session.user.status = token.status as string
      if (token.accessToken) {
        session.accessToken = token.accessToken as string
        session.user.token = token.accessToken as string
      }
      if (token.accessTokenExpiresAt)
        session.accessTokenExpiresAt = token.accessTokenExpiresAt as string
      return session
    },
  },
  events: {
    async signOut(message) {
      const token = 'token' in message ? message.token : null

      if (!token) {
        return
      }

      const accessToken = typeof token.accessToken === 'string' ? token.accessToken : null
      const refreshToken =
        typeof token.refreshToken === 'string' ? token.refreshToken : null
      const refreshTokenCookieName =
        typeof token.refreshTokenCookieName === 'string'
          ? token.refreshTokenCookieName
          : null

      if (!accessToken && !(refreshToken && refreshTokenCookieName)) {
        return
      }

      await logoutFromBackend({
        accessToken,
        refreshCookie:
          refreshToken && refreshTokenCookieName
            ? {
                name: refreshTokenCookieName,
                value: refreshToken,
              }
            : null,
      }).catch(() => undefined)
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
