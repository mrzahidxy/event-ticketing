import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@/types/user';


declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      permissions?: string[]
      organizerId?: string
      role: UserRole
      status?: string
      token?: string
    } & DefaultSession['user']
    accessToken?: string
    accessTokenExpiresAt?: string
  }

  interface User {
    id: string
    organizerId?: string
    role: UserRole
    name: string
    email: string
    permissions?: string[]
    status?: string
    token?: string
    accessTokenExpiresAt?: string
    refreshToken?: string
    refreshTokenCookieName?: string
    refreshTokenExpiresAt?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    permissions?: string[]
    organizerId?: string
    role?: UserRole
    status?: string
    accessToken?: string
    accessTokenExpiresAt?: string
    refreshToken?: string
    refreshTokenCookieName?: string
    refreshTokenExpiresAt?: string
  }
}
