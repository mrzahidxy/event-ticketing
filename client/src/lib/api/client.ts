import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

import { appConfig } from '@/config/app'
import { HttpError } from '@/lib/errors'

type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>

type QueryParams = Record<string, QueryValue>

export type ApiRequestConfig = Omit<
  RequestInit,
  'body' | 'headers' | 'method'
> & {
  method?: RequestInit['method']
  query?: QueryParams
  data?: unknown
  headers?: HeadersInit
  auth?: boolean
  token?: string
  withCredentials?: boolean
}

type MaybePromise<T> = T | Promise<T>

export type ApiResponseContext = {
  data: unknown
  headers: Headers
  status: number
  url: string
}

export type ApiRequestContext = {
  config: ApiRequestConfig
  headers: Headers
  path: string
  url: URL
}

export type ApiClientOptions = {
  axiosInstance?: AxiosInstance
  baseUrl?: string
  basePath?: string
  defaultHeaders?: HeadersInit
  defaultInit?: Omit<ApiRequestConfig, 'data' | 'headers' | 'query' | 'token'>
  onError?: (
    error: HttpError,
    response: ApiResponseContext,
    context: ApiRequestContext,
  ) => MaybePromise<void>
  onRequest?: (context: ApiRequestContext) => MaybePromise<void>
  onResponse?: (
    response: ApiResponseContext,
    context: ApiRequestContext,
  ) => MaybePromise<void>
  parseError?: (response: ApiResponseContext) => MaybePromise<string>
  resolveToken?: () => MaybePromise<string | null>
}

const JSON_CONTENT_TYPE = 'application/json'

function joinUrlPath(basePath: string, path: string) {
  const parts = [basePath, path]
    .filter(Boolean)
    .map((segment, index) =>
      index === 0
        ? segment.replace(/\/+$/g, '')
        : segment.replace(/^\/+/g, ''),
    )

  const joined = parts.join('/')
  return joined.startsWith('/') ? joined : `/${joined}`
}

function serializeQueryParams(query?: QueryParams) {
  if (!query) {
    return ''
  }

  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        return
      }

      params.set(key, value.map((item) => String(item)).join(','))
      return
    }

    params.set(key, String(value))
  })

  return params.toString()
}

function withQueryString(url: URL, query?: QueryParams) {
  const serializedQuery = serializeQueryParams(query)
  if (!serializedQuery) {
    return url.toString()
  }

  url.search = serializedQuery
  return url.toString()
}

function headersToRecord(headers: Headers) {
  return Object.fromEntries(headers.entries())
}

function normalizeHeaders(headers?: HeadersInit) {
  return new Headers(headers ?? {})
}

function normalizeAxiosHeaders(headers: AxiosResponse['headers']) {
  const normalized = new Headers()
  const axiosHeaders = headers instanceof AxiosHeaders ? headers.toJSON() : headers

  Object.entries(axiosHeaders ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      normalized.set(key, value.join(', '))
      return
    }

    if (value !== undefined) {
      normalized.set(key, String(value))
    }
  })

  return normalized
}

async function resolveAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const { useAuthStore } = await import('@/stores/auth-store')
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      return accessToken
    }
  } catch {
    // Ignore store resolution issues and fall back to session lookup.
  }

  try {
    const { getSession } = await import('next-auth/react')
    const session = await getSession()

    return (
      session?.accessToken ??
      (session?.user as { token?: string })?.token ??
      null
    )
  } catch {
    return null
  }
}

function toResponseContext(response: AxiosResponse): ApiResponseContext {
  return {
    data: response.data,
    headers: normalizeAxiosHeaders(response.headers),
    status: response.status,
    url: response.config.url ?? '',
  }
}

async function defaultParseError(response: ApiResponseContext) {
  const data = response.data

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }

    try {
      return JSON.stringify(data)
    } catch {
      return 'Unknown error'
    }
  }

  return 'Unknown error'
}

function isBodyAllowed(data: unknown) {
  return data !== undefined && data !== null
}

export class ApiClient {
  private readonly axios: AxiosInstance
  private readonly baseUrl: string
  private readonly basePath: string
  private readonly defaultHeaders: HeadersInit
  private readonly defaultInit: Omit<ApiRequestConfig, 'data' | 'headers' | 'query' | 'token'>
  private readonly onError?: ApiClientOptions['onError']
  private readonly onRequest?: ApiClientOptions['onRequest']
  private readonly onResponse?: ApiClientOptions['onResponse']
  private readonly parseError: NonNullable<ApiClientOptions['parseError']>
  private readonly resolveToken: NonNullable<ApiClientOptions['resolveToken']>

  constructor(options: ApiClientOptions = {}) {
    const resolvedBaseUrl = options.baseUrl ?? appConfig.apiBaseUrl

    if (!resolvedBaseUrl) {
      throw new Error('ApiClient base URL is not configured')
    }

    this.axios =
      options.axiosInstance ??
      axios.create({
        headers: headersToRecord(normalizeHeaders(options.defaultHeaders)),
        validateStatus: () => true,
      })
    this.baseUrl = resolvedBaseUrl
    this.basePath = options.basePath ?? ''
    this.defaultHeaders = options.defaultHeaders ?? {}
    this.defaultInit = options.defaultInit ?? {}
    this.onError = options.onError
    this.onRequest = options.onRequest
    this.onResponse = options.onResponse
    this.parseError = options.parseError ?? defaultParseError
    this.resolveToken = options.resolveToken ?? resolveAuthToken
  }

  private buildUrl(path: string, query?: QueryParams) {
    const url = /^https?:\/\//.test(path)
      ? new URL(path)
      : new URL(joinUrlPath(this.basePath, path), this.baseUrl)

    return {
      url,
      requestUrl: withQueryString(url, query),
    }
  }

  async request<T>(path: string, config: ApiRequestConfig = {}) {
    const {
      auth: requiresAuth = false,
      data,
      headers,
      method,
      query,
      token,
      withCredentials,
      credentials,
      signal,
    } = config

    const { url, requestUrl } = this.buildUrl(path, query)
    const requestHeaders = normalizeHeaders(this.defaultHeaders)

    normalizeHeaders(headers).forEach((value, key) => {
      requestHeaders.set(key, value)
    })

    let resolvedToken = token
    if (requiresAuth && !resolvedToken) {
      resolvedToken = (await this.resolveToken()) || undefined
    }

    if (resolvedToken && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${resolvedToken}`)
    }

    const context: ApiRequestContext = {
      config,
      headers: requestHeaders,
      path,
      url,
    }

    if (this.onRequest) {
      await this.onRequest(context)
    }

    const resolvedWithCredentials =
      withCredentials ??
      (credentials === 'include'
        ? true
        : this.defaultInit.withCredentials ?? false)

    const requestConfig: AxiosRequestConfig = {
      data,
      headers: headersToRecord(requestHeaders),
      method: method ?? 'GET',
      signal: signal ?? undefined,
      url: requestUrl,
      withCredentials: resolvedWithCredentials,
    }

    if (!isBodyAllowed(data)) {
      delete requestConfig.data
    }

    if (
      requestHeaders.get('Content-Type') === JSON_CONTENT_TYPE &&
      data &&
      typeof data === 'object' &&
      !(data instanceof FormData)
    ) {
      requestConfig.data = data
    }

    const response = await this.axios.request(requestConfig)
    const responseContext = toResponseContext(response)

    if (response.status < 200 || response.status >= 300) {
      const error = new HttpError(
        response.status,
        await this.parseError(responseContext),
      )

      if (
        requiresAuth &&
        response.status === 401 &&
        typeof window !== 'undefined'
      ) {
        const { logoutForExpiredSession } = await import('@/lib/session-expiry')
        void logoutForExpiredSession()
      }

      if (this.onError) {
        await this.onError(error, responseContext, context)
      }

      throw error
    }

    if (this.onResponse) {
      await this.onResponse(responseContext, context)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.data as T
  }

  get<T>(path: string, config?: Omit<ApiRequestConfig, 'method' | 'data'>) {
    return this.request<T>(path, {
      ...config,
      method: 'GET',
    })
  }

  post<T>(
    path: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'data'>,
  ) {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      data,
    })
  }

  patch<T>(
    path: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'data'>,
  ) {
    return this.request<T>(path, {
      ...config,
      method: 'PATCH',
      data,
    })
  }

  put<T>(
    path: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'data'>,
  ) {
    return this.request<T>(path, {
      ...config,
      method: 'PUT',
      data,
    })
  }

  delete<T>(path: string, config?: Omit<ApiRequestConfig, 'method' | 'data'>) {
    return this.request<T>(path, {
      ...config,
      method: 'DELETE',
    })
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  return new ApiClient(options)
}

// Talk to the backend API directly instead of routing through Next.js.
const defaultApiClientBaseUrl = appConfig.apiBaseUrl

export const apiClient = createApiClient({ baseUrl: defaultApiClientBaseUrl })

export function apiFetch<T>(path: string, config?: ApiRequestConfig) {
  return apiClient.request<T>(path, config)
}
