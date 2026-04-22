import type { AdminUserRole } from '../../api/user-client'

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  OWNER: 'Owner',
  STAFF: 'Staff',
  USER: 'User',
}

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
}

export const ROLE_OPTIONS: { value: AdminUserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'USER', label: 'User' },
]
