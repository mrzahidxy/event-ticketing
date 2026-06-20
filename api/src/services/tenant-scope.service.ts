import { Role } from '@prisma/client';

import type { AuthenticatedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';

type TenantScopeDependencies = {
  prisma: Pick<typeof prisma, 'organizer' | 'organizerMembership'>;
};

export type OrganizerTenantScope = {
  visibility: 'platform' | 'organizer';
  organizerIds: string[];
  cacheScope: string;
};

type ResolveOrganizerTenantScopeOptions = {
  requestedOrganizerId?: string;
  allowAdminPlatform?: boolean;
  ownerNoOrganizerMessage?: string;
  staffNoAssignmentsMessage?: string;
  forbiddenMessage?: string;
};

const DEFAULT_FORBIDDEN_MESSAGE = 'You do not have permission to access this organizer scope';

export const resolveOwnedOrganizerId = async (
  deps: TenantScopeDependencies,
  actor: AuthenticatedUser
): Promise<string | null> => {
  const ownedOrganizer = await deps.prisma.organizer.findUnique({
    where: { ownerId: actor.id },
    select: { id: true },
  });

  return ownedOrganizer?.id ?? null;
};

export const resolveAssignedOrganizerIds = async (
  deps: TenantScopeDependencies,
  actor: AuthenticatedUser
): Promise<string[]> => {
  const assignments = await deps.prisma.organizerMembership.findMany({
    where: { userId: actor.id },
    select: { organizerId: true },
  });

  return assignments.map((assignment) => assignment.organizerId);
};

const ensureOrganizerExists = async (
  deps: TenantScopeDependencies,
  organizerId: string
): Promise<void> => {
  const organizer = await deps.prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { id: true },
  });

  if (!organizer) {
    throw new HttpError(404, 'Organizer not found');
  }
};

export const resolveOrganizerTenantScope = async (
  deps: TenantScopeDependencies,
  actor: AuthenticatedUser,
  options: ResolveOrganizerTenantScopeOptions = {}
): Promise<OrganizerTenantScope> => {
  const {
    requestedOrganizerId,
    allowAdminPlatform = true,
    ownerNoOrganizerMessage = 'Owner scope requires an owned organizer',
    staffNoAssignmentsMessage = 'Staff scope requires at least one organizer assignment',
    forbiddenMessage = DEFAULT_FORBIDDEN_MESSAGE,
  } = options;

  if (actor.role === Role.ADMIN) {
    if (requestedOrganizerId) {
      await ensureOrganizerExists(deps, requestedOrganizerId);
      return {
        visibility: 'organizer',
        organizerIds: [requestedOrganizerId],
        cacheScope: `organizer:${requestedOrganizerId}`,
      };
    }

    if (!allowAdminPlatform) {
      throw new HttpError(403, forbiddenMessage);
    }

    return {
      visibility: 'platform',
      organizerIds: [],
      cacheScope: 'platform',
    };
  }

  if (actor.role === Role.OWNER) {
    const ownedOrganizerId = await resolveOwnedOrganizerId(deps, actor);

    if (!ownedOrganizerId) {
      throw new HttpError(403, ownerNoOrganizerMessage);
    }

    if (requestedOrganizerId && requestedOrganizerId !== ownedOrganizerId) {
      throw new HttpError(403, forbiddenMessage);
    }

    return {
      visibility: 'organizer',
      organizerIds: [ownedOrganizerId],
      cacheScope: `organizer:${ownedOrganizerId}`,
    };
  }

  if (actor.role === Role.STAFF) {
    const assignedOrganizerIds = await resolveAssignedOrganizerIds(deps, actor);

    if (assignedOrganizerIds.length === 0) {
      throw new HttpError(403, staffNoAssignmentsMessage);
    }

    if (requestedOrganizerId && !assignedOrganizerIds.includes(requestedOrganizerId)) {
      throw new HttpError(403, forbiddenMessage);
    }

    const organizerIds = requestedOrganizerId ? [requestedOrganizerId] : assignedOrganizerIds;

    return {
      visibility: 'organizer',
      organizerIds,
      cacheScope: `organizer:${organizerIds.slice().sort().join(',')}`,
    };
  }

  throw new HttpError(403, forbiddenMessage);
};
