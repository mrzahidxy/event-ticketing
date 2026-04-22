'use client'

import { apiClient } from '@/lib/api'
import { extractList } from '@/lib/api/normalizers'

export type AdminOrganizerStatus = 'ACTIVE' | 'SUSPENDED'

export type AdminOrganizerDirectoryItem = {
  id: string
  organizerId: string
  organizer: string
  ownerEmail?: string
  createdAt?: string
  updatedAt?: string
  status: 'Active' | 'Suspended'
  staffCount: number
  eventCount: number
}

export type AdminAuditLog = {
  id: string
  timestamp: string
  actor: string
  action: string
  target: string
  scope: 'Organizer' | 'System'
  details?: string
}

export type AdminSystemOverview = {
  metrics: {
    totalOrganizers: number
    activeUsers: number
    publishedEvents: number
    totalBookings: number
    totalRevenue: number
  }
  status: {
    suspendedOrganizers: number
    pendingBookings: number
    pendingPayments: number
  }
  highlights: {
    totalRevenueLabel: string
    activeUsersLabel: string
    latestActivityLabel: string
  }
  activitySeries: Array<{
    date: string
    count: number
  }>
  recentActivity: AdminAuditLog[]
}

type ListResponse<T> = {
  data?: T[]
}

type ApiResponse<T> = {
  message?: string
} & T

function unwrapData<T = unknown>(payload: unknown): T | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: unknown }).data !== undefined
  ) {
    return (payload as { data?: unknown }).data as T
  }

  return (payload as T) ?? null
}

function toObject(payload: unknown): Record<string, unknown> | null {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return null
  }

  return payload as Record<string, unknown>
}

function toArray<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  const record = toObject(payload)

  if (!record) {
    return []
  }

  if (Array.isArray(record.data)) {
    return record.data as T[]
  }

  if (Array.isArray(record.items)) {
    return record.items as T[]
  }

  if (Array.isArray(record.results)) {
    return record.results as T[]
  }

  return []
}

function toStringValue(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return fallback
}

function toNumberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function normalizeAdminOrganizer(entry: unknown): AdminOrganizerDirectoryItem {
  const record = toObject(entry)
  const organizerRecord = toObject(record?.organizer)
  const organizerId = toStringValue(record?.organizerId ?? organizerRecord?.id)
  const organizerName = toStringValue(
    record?.organizerName ?? record?.organizer ?? record?.name,
    'Unknown organizer',
  )
  const rawStatus = toStringValue(record?.status, 'active').toLowerCase()
  const normalizedStatus =
    rawStatus === 'active'
      ? 'Active'
      : 'Suspended'

  return {
    id: toStringValue(record?.id ?? organizerId),
    organizerId,
    organizer: organizerName,
    ownerEmail: toStringValue(toObject(record?.owner)?.email, ''),
    createdAt: toStringValue(record?.createdAt, ''),
    updatedAt: toStringValue(record?.updatedAt),
    status: normalizedStatus,
    staffCount: toNumberValue(record?.staffCount),
    eventCount: toNumberValue(record?.eventCount),
  }
}

function normalizeAdminAuditLog(entry: unknown): AdminAuditLog {
  const record = toObject(entry)
  const rawScope = toStringValue(record?.scope, 'System')

  return {
    id: toStringValue(record?.id),
    timestamp: toStringValue(record?.timestamp),
    actor: toStringValue(record?.actor, 'system'),
    action: toStringValue(record?.action, 'Unknown action'),
    target: toStringValue(record?.target, '—'),
    scope: rawScope === 'Organizer' ? 'Organizer' : 'System',
    details: toStringValue(record?.details),
  }
}

function normalizeActivitySeries(entry: unknown) {
  const record = toObject(entry)

  return {
    date: toStringValue(record?.date ?? record?.timestamp ?? record?.label),
    count: toNumberValue(record?.count ?? record?.calls ?? record?.value ?? record?.total),
  }
}

function normalizeAdminSystemOverview(payload: unknown): AdminSystemOverview {
  const source = toObject(unwrapData(payload) ?? payload) ?? {}
  const metrics = toObject(source.metrics) ?? {}
  const status = toObject(source.status) ?? {}
  const highlights = toObject(source.highlights) ?? {}

  return {
    metrics: {
      totalOrganizers: toNumberValue(metrics.totalOrganizers),
      activeUsers: toNumberValue(metrics.activeUsers),
      publishedEvents: toNumberValue(metrics.publishedEvents),
      totalBookings: toNumberValue(metrics.totalBookings),
      totalRevenue: toNumberValue(metrics.totalRevenue),
    },
    status: {
      suspendedOrganizers: toNumberValue(status.suspendedOrganizers),
      pendingBookings: toNumberValue(status.pendingBookings),
      pendingPayments: toNumberValue(status.pendingPayments),
    },
    highlights: {
      totalRevenueLabel: toStringValue(highlights.totalRevenueLabel, 'No completed payments yet'),
      activeUsersLabel: toStringValue(highlights.activeUsersLabel, 'No user activity yet'),
      latestActivityLabel: toStringValue(highlights.latestActivityLabel, 'No recent activity'),
    },
    activitySeries: toArray(source.activitySeries)
      .map(normalizeActivitySeries)
      .filter((entry) => entry.date),
    recentActivity: toArray(source.recentActivity).map(normalizeAdminAuditLog),
  }
}

export async function listAdminOrganizers() {
  const response = await apiClient.get<ListResponse<AdminOrganizerDirectoryItem>>('/api/admin/organizers', {
    auth: true,
    cache: 'no-store',
  })

  return extractList(response, ['organizers', 'items'], normalizeAdminOrganizer)
}

export async function listAdminAuditLogs() {
  const response = await apiClient.get<ListResponse<AdminAuditLog>>('/api/admin/support/logs', {
    auth: true,
    cache: 'no-store',
  })

  return extractList(response, ['logs', 'auditLogs', 'items'], normalizeAdminAuditLog)
}

export async function getAdminOrganizerActivity(organizerId: string) {
  const response = await apiClient.get<ListResponse<AdminAuditLog>>(
    `/api/admin/organizers/${organizerId}/activity`,
    {
      auth: true,
      cache: 'no-store',
    },
  )

  return extractList(response, ['activity', 'logs', 'items'], normalizeAdminAuditLog)
}

export async function getAdminSystemOverview() {
  const response = await apiClient.get<AdminSystemOverview>('/api/admin/system/overview', {
    auth: true,
    cache: 'no-store',
  })

  return normalizeAdminSystemOverview(response)
}

export async function updateAdminOrganizerStatus(
  organizerId: string,
  status: 'active' | 'suspended',
) {
  return apiClient.patch<ApiResponse<{ organizer: { id: string; status: AdminOrganizerStatus } }>>(
    `/api/organizers/${organizerId}/status`,
    { status },
    {
      auth: true,
    },
  )
}

export async function deleteAdminOrganizer(organizerId: string) {
  await apiClient.delete<unknown>(`/api/organizers/${organizerId}`, {
    auth: true,
  })

  return {
    message: 'Organizer deleted successfully',
  }
}
