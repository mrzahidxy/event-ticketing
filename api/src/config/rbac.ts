import { Role } from '@prisma/client';

export const PERMISSION_KEYS = [
  'ORGANIZER_CREATE',
  'ORGANIZER_READ_OWN',
  'ORGANIZER_UPDATE_OWN',
  'ORGANIZER_MANAGE_EVENTS',
  'ORGANIZER_MANAGE_STAFF',
  'EVENT_CREATE',
  'EVENT_READ',
  'EVENT_UPDATE',
  'EVENT_DELETE',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type AppRole = Role | 'GUEST';
export const GUEST_ROLE: AppRole = 'GUEST';

export const PERMISSIONS: Record<
  PermissionKey,
  {
    label: string;
    description: string;
  }
> = {
  ORGANIZER_CREATE: {
    label: 'Create Organizer',
    description: 'Create a new organizer profile.',
  },
  ORGANIZER_READ_OWN: {
    label: 'Read Own Organizer',
    description: 'View the organizer profile assigned to the current user.',
  },
  ORGANIZER_UPDATE_OWN: {
    label: 'Update Own Organizer',
    description: 'Update the organizer profile assigned to the current user.',
  },
  ORGANIZER_MANAGE_EVENTS: {
    label: 'Manage Events',
    description: 'Create, update, or remove events for an organizer.',
  },
  ORGANIZER_MANAGE_STAFF: {
    label: 'Manage Staff',
    description: 'Assign or remove staff members for an organizer.',
  },
  EVENT_CREATE: {
    label: 'Create Event',
    description: 'Create a new event under an organizer.',
  },
  EVENT_READ: {
    label: 'Read Events',
    description: 'View events under an organizer.',
  },
  EVENT_UPDATE: {
    label: 'Update Events',
    description: 'Update event details.',
  },
  EVENT_DELETE: {
    label: 'Delete Events',
    description: 'Remove events.',
  },
};

export const ROLE_PRESETS: Record<Role, PermissionKey[]> = {
  [Role.ADMIN]: [...PERMISSION_KEYS],
  [Role.OWNER]: [...PERMISSION_KEYS],
  [Role.STAFF]: ['ORGANIZER_READ_OWN', 'EVENT_READ'],
  [Role.USER]: ['EVENT_READ'],
};

export const ROLE_METADATA: Record<AppRole, { label: string; description: string }> = {
  [Role.ADMIN]: { label: 'Admin', description: 'Platform-wide control' },
  [Role.OWNER]: { label: 'Owner', description: 'Full control of an organizer' },
  [Role.STAFF]: { label: 'Staff', description: 'Limited operational access to assigned organizers' },
  [Role.USER]: { label: 'User', description: 'Standard authenticated user' },
  [GUEST_ROLE]: { label: 'Guest', description: 'Unauthenticated public access' },
};

export const normalizePermissions = (input?: string[] | null): PermissionKey[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed = new Set<PermissionKey>(PERMISSION_KEYS);
  const deduped: PermissionKey[] = [];

  for (const value of input) {
    if (allowed.has(value as PermissionKey) && !deduped.includes(value as PermissionKey)) {
      deduped.push(value as PermissionKey);
    }
  }

  return deduped;
};

export const resolvePermissions = (role: Role, explicit?: string[] | null): PermissionKey[] => {
  if (explicit !== undefined && explicit !== null) {
    return normalizePermissions(explicit);
  }

  return ROLE_PRESETS[role] ?? [];
};

export const rbacDefinitions = () => ({
  permissions: PERMISSION_KEYS.map((key) => ({
    key,
    ...PERMISSIONS[key],
  })),
  roles: [
    ...Object.entries(ROLE_PRESETS).map(([role, permissions]) => ({
      role: role as Role,
      label: ROLE_METADATA[role as Role]?.label ?? role,
      description: ROLE_METADATA[role as Role]?.description ?? '',
      permissions,
    })),
    {
      role: GUEST_ROLE,
      label: ROLE_METADATA[GUEST_ROLE].label,
      description: ROLE_METADATA[GUEST_ROLE].description,
      permissions: ['EVENT_READ'],
    },
  ],
});
