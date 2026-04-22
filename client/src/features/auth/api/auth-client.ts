'use client'

import { apiClient } from '@/lib/api'
import { extractEntity } from '@/lib/api/normalizers'
import { normalizeUserLike } from '@/lib/api/normalizers'
import { unwrapData } from '@/lib/api/normalizers'
import { useAuthStore } from '@/stores/auth-store'
import type { AuthSessionPayload, AuthenticatedUser } from '@/types/auth'

export type RegisterRequest = {
  email: string
  password: string
  name?: string
}

export type LoginRequest = {
  email: string
  password: string
}

type RawAuthSessionResponse = Partial<AuthSessionPayload> & {
  accessToken?: string
  accessTokenExpiresAt?: string
  expiresAt?: string
  message?: string
  refreshExpiresAt?: string
  refreshToken?: string
  refreshTokenExpiresAt?: string
  token?: string
  user?: Partial<AuthenticatedUser> | null
}
type ApiEnvelope<T> = { data?: T | null; meta?: Record<string, unknown>; message?: string }

type LogoutResponse = {
  message?: string
}

function normalizeUser(user: unknown): AuthenticatedUser {
  const normalized = normalizeUserLike(user)

  return {
    createdAt: normalized.createdAt,
    email: normalized.email,
    id: normalized.id,
    name: normalized.name ?? '',
    permissions: normalized.permissions ?? [],
    organizerId: normalized.organizerId ?? null,
    role: normalized.role,
    status: normalized.status,
    updatedAt: normalized.updatedAt,
  }
}

function normalizeAuthSession(payload: RawAuthSessionResponse): AuthSessionPayload {
  const accessToken = payload.accessToken ?? payload.token
  const accessTokenExpiresAt =
    payload.accessTokenExpiresAt ?? payload.expiresAt ?? ''
  const refreshTokenExpiresAt =
    payload.refreshTokenExpiresAt ??
    payload.refreshExpiresAt ??
    payload.expiresAt ??
    ''

  if (!accessToken) {
    throw new Error('Authentication response did not include an access token')
  }

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    user: normalizeUser(payload.user),
  }
}

function extractAuthPayload(payload: RawAuthSessionResponse | ApiEnvelope<RawAuthSessionResponse>) {
  return (unwrapData<RawAuthSessionResponse>(payload) ?? payload) as RawAuthSessionResponse
}

function applySession(session: AuthSessionPayload) {
  useAuthStore.getState().setSession(session)
  return session
}

export async function register(input: RegisterRequest) {
  await apiClient.post<RawAuthSessionResponse | ApiEnvelope<RawAuthSessionResponse>>(
    '/api/auth/register',
    input,
    {
      withCredentials: true,
    },
  )
}

export async function login(input: LoginRequest) {
  const payload = await apiClient.post<RawAuthSessionResponse | ApiEnvelope<RawAuthSessionResponse>>(
    '/api/auth/login',
    input,
    {
      withCredentials: true,
    },
  )

  return applySession(normalizeAuthSession(extractAuthPayload(payload)))
}

export async function refreshSession(token?: string | null) {
  const payload = await apiClient.post<RawAuthSessionResponse | ApiEnvelope<RawAuthSessionResponse>>(
    '/api/auth/refresh',
    undefined,
    {
      auth: true,
      token: token ?? undefined,
      withCredentials: true,
    },
  )

  return applySession(normalizeAuthSession(extractAuthPayload(payload)))
}

export async function logout(token?: string | null) {
  await apiClient.post<unknown>('/api/auth/logout', undefined, {
    auth: true,
    token: token ?? undefined,
    withCredentials: true,
  })

  useAuthStore.getState().clearSession()

  return {
    message: 'Logged out successfully',
  } satisfies LogoutResponse
}

export async function getCurrentUser() {
  const response = await apiClient.get<unknown>('/api/auth/me', {
    auth: true,
  })
  const user = extractEntity(response, ['user'], normalizeUser)

  useAuthStore.getState().setUser(user)
  return user
}
