'use client'

import { apiClient } from '@/lib/api'
import {
  extractEntity,
  extractList,
  normalizePaginationMeta,
  toArray,
  toObject,
  toStringValue,
  unwrapData,
} from '@/lib/api/normalizers'

export type ApiUserRole = 'ADMIN' | 'OWNER' | 'STAFF' | 'USER'
export type AdminUserStatus = 'ACTIVE' | 'INACTIVE'

export type AdminUserRole = ApiUserRole

export type AdminUser = {
  createdAt: string
  email: string
  id: string
  business?: string | null
  name?: string | null
  organizerId?: string | null
  organizerName?: string | null
  permissions?: string[]
  role: AdminUserRole
  status?: AdminUserStatus
  updatedAt: string
}

export type UserListFilters = {
  limit?: number
  page?: number
  pageSize?: number
  role?: AdminUserRole
  status?: AdminUserStatus
  search?: string
}

export type CreateUserInput = {
  email: string
  name?: string
  password: string
  permissions?: string[]
  role?: AdminUserRole
}

export type UpdateUserProfileInput = {
  email?: string
  name?: string | null
  status?: AdminUserStatus
}

export type UpdateUserRoleInput = {
  permissions?: string[]
  role: AdminUserRole
}

export type UserListResult = {
  meta?: {
    limit?: number
    page?: number
    totalItems?: number
    totalPages?: number
  }
  users: AdminUser[]
}

type ApiResponse<T> = {
  message?: string
} & T

type RawUserListResponse =
  | AdminUser[]
  | { users: AdminUser[]; meta?: UserListResult['meta'] }
  | { data: AdminUser[]; meta?: UserListResult['meta'] }
  | ApiResponse<{ users: AdminUser[]; meta?: UserListResult['meta'] }>
  | ApiResponse<{ data: AdminUser[]; meta?: UserListResult['meta'] }>
  | ApiResponse<AdminUser[]>

function normalizeUserRole(value: unknown): AdminUserRole {
  const normalized = toStringValue(value, 'USER').toUpperCase()

  if (
    normalized === 'ADMIN' ||
    normalized === 'OWNER' ||
    normalized === 'STAFF' ||
    normalized === 'USER'
  ) {
    return normalized
  }

  return 'USER'
}

function normalizeUserStatus(value: unknown): AdminUserStatus {
  return toStringValue(value, 'ACTIVE').toUpperCase() === 'INACTIVE'
    ? 'INACTIVE'
    : 'ACTIVE'
}

function normalizeAdminUser(entry: unknown): AdminUser {
  const record = toObject(entry)

  return {
    createdAt: toStringValue(record?.createdAt),
    email: toStringValue(record?.email),
    id: toStringValue(record?.id),
    name: toStringValue(record?.name) || null,
    organizerId: toStringValue(record?.organizerId) || null,
    organizerName: toStringValue(record?.organizerName) || null,
    business:
      toStringValue(record?.business) ||
      toStringValue(record?.organizerName) ||
      null,
    permissions: toArray(record?.permissions).map((value) => toStringValue(value)),
    role: normalizeUserRole(record?.role),
    status: normalizeUserStatus(record?.status),
    updatedAt: toStringValue(record?.updatedAt),
  }
}

function normalizeUserListResponse(payload: RawUserListResponse): UserListResult {
  const rootPayload = unwrapData(payload) ?? payload
  const users = extractList(payload, ['users'], normalizeAdminUser)

  return {
    meta: normalizePaginationMeta(toObject(rootPayload), users.length),
    users,
  }
}

export async function listUsers(
  filters: Partial<UserListFilters> = {},
): Promise<UserListResult> {
  const response = await apiClient.get<RawUserListResponse>('/api/users', {
    auth: true,
    cache: 'no-store',
    query: {
      limit: filters.limit ?? filters.pageSize,
      page: filters.page,
      role: filters.role,
      status: filters.status,
      search: filters.search,
    },
  })

  return normalizeUserListResponse(response)
}

export async function getUserById(id: string): Promise<AdminUser> {
  const response = await apiClient.get<unknown>(`/api/users/${id}`, {
    auth: true,
    cache: 'no-store',
  })

  return extractEntity(response, ['user'], normalizeAdminUser)
}

export async function createUser(input: CreateUserInput) {
  const response = await apiClient.post<unknown>('/api/users', input, {
    auth: true,
  })
  const message = toObject(response)?.message

  return {
    message: typeof message === 'string' ? message : 'User created successfully',
    user: extractEntity(response, ['user'], normalizeAdminUser),
  } satisfies ApiResponse<{ user: AdminUser }>
}

export async function updateUserProfile(
  id: string,
  input: UpdateUserProfileInput,
) {
  const response = await apiClient.patch<unknown>(
    `/api/users/${id}`,
    input,
    {
      auth: true,
    },
  )
  const message = toObject(response)?.message

  return {
    message: typeof message === 'string' ? message : 'User updated successfully',
    user: extractEntity(response, ['user'], normalizeAdminUser),
  } satisfies ApiResponse<{ user: AdminUser }>
}

export async function updateUserRole(id: string, input: UpdateUserRoleInput) {
  const response = await apiClient.patch<unknown>(
    `/api/users/${id}/role`,
    input,
    {
      auth: true,
    },
  )
  const message = toObject(response)?.message

  return {
    message: typeof message === 'string' ? message : 'User role updated successfully',
    user: extractEntity(response, ['user'], normalizeAdminUser),
  } satisfies ApiResponse<{ user: AdminUser }>
}

export async function deleteUser(id: string) {
  await apiClient.delete<unknown>(`/api/users/${id}`, {
    auth: true,
  })

  return {
    message: 'User deleted successfully',
  }
}
