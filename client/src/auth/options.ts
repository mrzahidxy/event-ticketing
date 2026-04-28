import { createHash } from 'node:crypto'
import { getOptionalOAuthProviders } from '@/auth/providers'
import { authRoutes } from '@/auth/routes'
import { appConfig } from '@/config/app'
import { env } from '@/config/env'
import { loginSchema } from '@/validation/auth-schema'
import type { NextAuthConfig, User } from 'next-auth'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import {
  loginWithBackend,
  logoutFromBackend,
  refreshBackendSession,
} from '@/server/auth/backend-auth'
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

const isProductionBuild = env.NEXT_PHASE === 'phase-production-build'
const fallbackAuthSecret = createHash('sha256')
  .update(`${process.cwd()}:${appConfig.name}:dev-auth-secret`)
  .digest('hex')

function resolveAuthSecret() {
  const configuredSecret = env.NEXTAUTH_SECRET ?? env.AUTH_SECRET
  if (configuredSecret) {
    return configuredSecret
  }

  if (env.NODE_ENV !== 'production' || isProductionBuild) {
    if (isProductionBuild) {
      console.warn(
        'NEXTAUTH_SECRET is not set. Using a stable development secret during next build. Set NEXTAUTH_SECRET or AUTH_SECRET before running the app in production.',
      )
    }

    return fallbackAuthSecret
  }

  throw new Error('NEXTAUTH_SECRET or AUTH_SECRET environment variable is required')
}

const secret = resolveAuthSecret()

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
        if ('role' in user && user.role) {
          token.role = user.role as UserRole
        }
        if ('organizerId' in user && user.organizerId) {
          token.organizerId = user.organizerId
        }
        if ('permissions' in user && user.permissions) {
          token.permissions = user.permissions
        }
        if ('status' in user && user.status) {
          token.status = user.status
        }
        if ('token' in user && user.token) {
          token.accessToken = user.token
        }
        if ('accessTokenExpiresAt' in user && user.accessTokenExpiresAt) {
          token.accessTokenExpiresAt = user.accessTokenExpiresAt
        }
        if ('refreshToken' in user && user.refreshToken) {
          token.refreshToken = user.refreshToken
        }
        if ('refreshTokenCookieName' in user && user.refreshTokenCookieName) {
          token.refreshTokenCookieName = user.refreshTokenCookieName
        }
        if ('refreshTokenExpiresAt' in user && user.refreshTokenExpiresAt) {
          token.refreshTokenExpiresAt = user.refreshTokenExpiresAt
        }
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
        token.organizerId = refreshed.user.organizerId ?? token.organizerId
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
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.name) {
        session.user.name = token.name
      }
      if (token.email) {
        session.user.email = token.email
      }
      if (token.role) {
        session.user.role = token.role as UserRole
      }
      if (token.organizerId) {
        session.user.organizerId = token.organizerId as string
      }
      if (token.permissions) {
        session.user.permissions = token.permissions as string[]
      }
      if (token.status) {
        session.user.status = token.status as string
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken as string
        session.user.token = token.accessToken as string
      }
      if (token.accessTokenExpiresAt) {
        session.accessTokenExpiresAt = token.accessTokenExpiresAt as string
      }
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
