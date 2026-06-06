import { env } from '@/config/env'

type BackendAuthUser = {
  organizerId?: string | null
  id: string | number
  email: string
  name?: string | null
  permissions?: string[]
  role?: string | null
  status?: string | null
}

type BackendAuthResponse = {
  accessToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
  user: BackendAuthUser
}

type RawBackendAuthResponse = Partial<BackendAuthResponse> & {
  token?: string
  expiresAt?: string
  refreshExpiresAt?: string
  user?: Partial<BackendAuthUser> | null
}
type BackendEnvelope<T> = {
  data?: T | null
  meta?: Record<string, unknown>
  message?: string
}

type BackendRefreshCookie = {
  name: string
  value: string
}

type BackendAuthSession = BackendAuthResponse & {
  refreshCookie: BackendRefreshCookie | null
}

type BackendSessionInput = {
  accessToken?: string | null
  refreshCookie?: BackendRefreshCookie | null
}

const API_BASE_URL = env.API_INTERNAL_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL

function buildBackendUrl(path: string) {
  return new URL(path, API_BASE_URL).toString()
}

function headersToObject(headers?: HeadersInit) {
  if (!headers) {
    return {}
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return headers
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function splitSetCookieHeader(header: string) {
  return header.split(/,(?=[^;,=\s]+=[^;,]+)/g)
}

function extractRefreshCookie(response: Response): BackendRefreshCookie | null {
  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie

  const rawCookies = typeof getSetCookie === 'function'
    ? getSetCookie.call(response.headers)
    : (() => {
        const header = response.headers.get('set-cookie')
        return header ? splitSetCookieHeader(header) : []
      })()

  for (const cookie of rawCookies) {
    const [pair] = cookie.split(';', 1)
    const separatorIndex = pair.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const name = pair.slice(0, separatorIndex).trim()
    const value = pair.slice(separatorIndex + 1).trim()

    if (!name || !value) {
      continue
    }

    return { name, value }
  }

  return null
}

async function parseResponseBody(response: Response) {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  const bodyText = await response.text()

  if (!bodyText.trim()) {
    return null
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(bodyText) as unknown
  }

  return bodyText
}

function normalizeBackendAuthResponse(payload: unknown): BackendAuthResponse {
  const rawPayload = (payload ?? {}) as RawBackendAuthResponse | BackendEnvelope<RawBackendAuthResponse>
  const candidateData =
    rawPayload && typeof rawPayload === 'object' && 'data' in rawPayload
      ? (rawPayload as BackendEnvelope<RawBackendAuthResponse>).data ?? {}
      : rawPayload
  const data = candidateData as RawBackendAuthResponse
  const accessToken = data.accessToken ?? data.token
  const accessTokenExpiresAt = data.accessTokenExpiresAt ?? data.expiresAt
  const refreshTokenExpiresAt =
    data.refreshTokenExpiresAt ?? data.refreshExpiresAt ?? data.expiresAt

  if (!isNonEmptyString(accessToken)) {
    throw new Error('Backend auth response did not include an access token')
  }

  if (!isNonEmptyString(accessTokenExpiresAt)) {
    throw new Error('Backend auth response did not include an access token expiry')
  }

  if (!isNonEmptyString(refreshTokenExpiresAt)) {
    throw new Error('Backend auth response did not include a refresh token expiry')
  }

  if (!data.user || !isNonEmptyString(data.user.email)) {
    throw new Error('Backend auth response did not include a valid user')
  }

  return {
    accessToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    user: {
      organizerId: data.user.organizerId ?? null,
      id: data.user.id ?? '',
      email: data.user.email,
      name: data.user.name ?? null,
      permissions: Array.isArray(data.user.permissions)
        ? data.user.permissions.filter(isNonEmptyString)
        : [],
      role: data.user.role ?? 'USER',
      status: data.user.status ?? 'ACTIVE',
    },
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

async function sendBackendAuthRequest(
  path: string,
  init: RequestInit,
  fallbackErrorMessage: string,
) {
  const response = await fetch(buildBackendUrl(path), {
    ...init,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...headersToObject(init.headers),
    },
  })

  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackErrorMessage))
  }

  return {
    payload,
    refreshCookie: extractRefreshCookie(response),
  }
}

export async function loginWithBackend(input: { email: string; password: string }) {
  const { payload, refreshCookie } = await sendBackendAuthRequest(
    '/api/auth/login',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    },
    'Invalid credentials',
  )

  return {
    ...normalizeBackendAuthResponse(payload),
    refreshCookie,
  } satisfies BackendAuthSession
}

export async function refreshBackendSession(input: BackendSessionInput) {
  const headers = new Headers()

  if (input.accessToken) {
    headers.set('authorization', `Bearer ${input.accessToken}`)
  }

  if (input.refreshCookie) {
    headers.set('cookie', `${input.refreshCookie.name}=${input.refreshCookie.value}`)
  }

  const { payload, refreshCookie } = await sendBackendAuthRequest(
    '/api/auth/refresh',
    {
      method: 'POST',
      headers,
    },
    'Unable to refresh session',
  )

  return {
    ...normalizeBackendAuthResponse(payload),
    refreshCookie: refreshCookie ?? input.refreshCookie ?? null,
  } satisfies BackendAuthSession
}

export async function logoutFromBackend(input: BackendSessionInput) {
  const headers = new Headers()

  if (input.accessToken) {
    headers.set('authorization', `Bearer ${input.accessToken}`)
  }

  if (input.refreshCookie) {
    headers.set('cookie', `${input.refreshCookie.name}=${input.refreshCookie.value}`)
  }

  await sendBackendAuthRequest(
    '/api/auth/logout',
    {
      method: 'POST',
      headers,
    },
    'Unable to log out',
  )
}
