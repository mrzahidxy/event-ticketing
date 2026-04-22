'use client'

import { apiClient } from '@/lib/api'
import {
  extractEntity,
  extractList,
  normalizeEvent,
  normalizeOrganizer,
  normalizeUserLike,
  toObject,
} from '@/lib/api/normalizers'

export type OrganizerStaffMember = {
  createdAt: string
  email: string
  id: string
  name?: string | null
  permissions?: string[]
  role: string
  status: string
  updatedAt: string
}

export type CreateOrganizerRequest = {
  name: string
  ownerId?: number
}

export type UpdateOrganizerRequest = {
  name: string
}

export type CreateOrganizerEventRequest = {
  description?: string
  name: string
  isPublished?: boolean
  price: number
}

export type UpdateOrganizerEventRequest = {
  description?: string | null
  name?: string
  isPublished?: boolean
  price?: number
}

export type AddOrganizerStaffRequest = {
  userId: number
}

export type OrganizerStaffCandidate = {
  email: string
  id: string
  name?: string | null
  role: string
}

function normalizeOrganizerStaffMember(entry: unknown): OrganizerStaffMember {
  const record = toObject(entry)
  const normalized = normalizeUserLike(record?.user ?? entry)
  const assignedAt =
    typeof record?.assignedAt === 'string' ? record.assignedAt : ''

  return {
    createdAt: normalized.createdAt || assignedAt,
    email: normalized.email,
    id: normalized.id,
    name: normalized.name,
    permissions: normalized.permissions,
    role: normalized.role,
    status: normalized.status,
    updatedAt: normalized.updatedAt || assignedAt,
  } satisfies OrganizerStaffMember
}

export async function createOrganizer(input: CreateOrganizerRequest) {
  const response = await apiClient.post<unknown>(
    '/api/organizers',
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['organizer'], normalizeOrganizer)
}

export async function listOrganizers() {
  const response = await apiClient.get<unknown>(
    '/api/organizers',
    {
      auth: true,
      cache: 'no-store',
    },
  )

  return extractList(response, ['organizers'], normalizeOrganizer)
}

export async function getOrganizer(organizerId: string) {
  const response = await apiClient.get<unknown>(`/api/organizers/${organizerId}`, {
    auth: true,
    cache: 'no-store',
  })

  return extractEntity(response, ['organizer'], normalizeOrganizer)
}

export async function updateOrganizer(
  organizerId: string,
  input: UpdateOrganizerRequest,
) {
  const response = await apiClient.patch<unknown>(
    `/api/organizers/${organizerId}`,
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['organizer'], normalizeOrganizer)
}

export async function listOrganizerEvents(organizerId: string) {
  const response = await apiClient.get<unknown>(
    `/api/organizers/${organizerId}/events`,
    {
      auth: true,
      cache: 'no-store',
    },
  )

  return extractList(response, ['events'], normalizeEvent)
}

export async function createOrganizerEvent(
  organizerId: string,
  input: CreateOrganizerEventRequest,
) {
  const response = await apiClient.post<unknown>(
    `/api/organizers/${organizerId}/events`,
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['event'], normalizeEvent)
}

export async function updateOrganizerEvent(
  organizerId: string,
  eventId: string,
  input: UpdateOrganizerEventRequest,
) {
  const response = await apiClient.patch<unknown>(
    `/api/organizers/${organizerId}/events/${eventId}`,
    input,
    {
      auth: true,
    },
  )

  return extractEntity(response, ['event'], normalizeEvent)
}

export async function deleteOrganizerEvent(
  organizerId: string,
  eventId: string,
) {
  await apiClient.delete<unknown>(
    `/api/organizers/${organizerId}/events/${eventId}`,
    {
      auth: true,
    },
  )
}

export async function listOrganizerStaff(organizerId: string) {
  const response = await apiClient.get<unknown>(
    `/api/organizers/${organizerId}/staff`,
    {
      auth: true,
      cache: 'no-store',
    },
  )

  return extractList(response, ['staff', 'users'], normalizeOrganizerStaffMember)
}

export async function addOrganizerStaff(
  organizerId: string,
  input: AddOrganizerStaffRequest,
) {
  const response = await apiClient.post<unknown>(
    `/api/organizers/${organizerId}/staff`,
    input,
    {
      auth: true,
    },
  )

  return extractList(response, ['staff', 'users'], normalizeOrganizerStaffMember)
}

export async function listOrganizerStaffCandidates(
  organizerId: string,
  search: string,
  limit = 10,
) {
  const response = await apiClient.get<unknown>(
    `/api/organizers/${organizerId}/staff-candidates`,
    {
      auth: true,
      cache: 'no-store',
      query: {
        limit,
        search,
      },
    },
  )

  return extractList(response, ['users', 'staff'], (entry) => {
    const normalized = normalizeUserLike(entry)

    return {
      email: normalized.email,
      id: normalized.id,
      name: normalized.name,
      role: normalized.role,
    } satisfies OrganizerStaffCandidate
  })
}

export async function removeOrganizerStaff(
  organizerId: string,
  userId: string | number,
) {
  await apiClient.delete<unknown>(
    `/api/organizers/${organizerId}/staff/${userId}`,
    {
      auth: true,
    },
  )
}
