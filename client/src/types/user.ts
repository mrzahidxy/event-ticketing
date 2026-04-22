export const USER_ROLE_VALUES = [
  'ADMIN',
  'OWNER',
  'STAFF',
  'USER',
  'GUEST',
] as const

export type UserRole = (typeof USER_ROLE_VALUES)[number]

export type CanonicalUserRole =
  | 'ADMIN'
  | 'OWNER'
  | 'STAFF'
  | 'USER'
  | 'GUEST'

export type UserStatus = 'ACTIVE' | 'INACTIVE'

export const USER_PERMISSION_VALUES = [
  'ORGANIZER_CREATE',
  'ORGANIZER_READ_OWN',
  'ORGANIZER_UPDATE_OWN',
  'ORGANIZER_MANAGE_EVENTS',
  'ORGANIZER_MANAGE_STAFF',
  'EVENT_READ',
  'EVENT_CREATE',
  'EVENT_UPDATE',
  'EVENT_DELETE',
] as const

export type UserPermission = (typeof USER_PERMISSION_VALUES)[number]

export type AppUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  permissions: UserPermission[]
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

export type SafeUser = Omit<AppUser, 'passwordHash'>

const ROLE_PERMISSIONS: Record<CanonicalUserRole, UserPermission[]> = {
  ADMIN: [...USER_PERMISSION_VALUES],
  OWNER: [
    'ORGANIZER_CREATE',
    'ORGANIZER_READ_OWN',
    'ORGANIZER_UPDATE_OWN',
    'ORGANIZER_MANAGE_EVENTS',
    'ORGANIZER_MANAGE_STAFF',
    'EVENT_READ',
    'EVENT_CREATE',
    'EVENT_UPDATE',
    'EVENT_DELETE',
  ],
  STAFF: [
    'ORGANIZER_READ_OWN',
    'EVENT_READ',
    'EVENT_CREATE',
    'EVENT_UPDATE',
  ],
  USER: ['EVENT_READ'],
  GUEST: ['EVENT_READ'],
}

export function normalizeUserRole(role?: string | null): CanonicalUserRole {
  if (!role) {
    return 'USER'
  }

  const normalized = role.toUpperCase().replace(/\s+/g, '_')

  if (normalized === 'STUFFS' || normalized === 'STAFF') {
    return 'STAFF'
  }

  if (normalized === 'GUESTS' || normalized === 'GUEST') {
    return 'GUEST'
  }

  if (normalized === 'SUPER_ADMIN' || normalized === 'ADMIN') {
    return 'ADMIN'
  }

  if (normalized === 'OWNER') {
    return normalized
  }

  return 'GUEST'
}

export function isAdminRole(role?: string | null) {
  const normalized = normalizeUserRole(role)
  return normalized === 'ADMIN'
}

export function isOwnerRole(role?: string | null) {
  return normalizeUserRole(role) === 'OWNER'
}

export function isStaffRole(role?: string | null) {
  return normalizeUserRole(role) === 'STAFF'
}

export function defaultPermissionsForRole(role?: string | null): UserPermission[] {
  return [...ROLE_PERMISSIONS[normalizeUserRole(role)]]
}
