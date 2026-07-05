import { OrganizerRole, Prisma, Role } from '@prisma/client';

import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/http-error';
import type { AuthenticatedUser } from '../types/user';
import { cache } from '../utils/cache';
import { resolvePermissions } from '../config/rbac';

const ORGANIZER_SELECT = {
  id: true,
  name: true,
  ownerId: true,
  isSuspended: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const EVENT_SELECT = {
  id: true,
  organizerId: true,
  name: true,
  description: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

const TICKET_TIER_SELECT = {
  id: true,
  eventId: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  quantityTotal: true,
  quantitySold: true,
  salesStartAt: true,
  salesEndAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PUBLIC_TICKET_TIER_SELECT = {
  id: true,
  eventId: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  quantityTotal: true,
  quantitySold: true,
  salesStartAt: true,
  salesEndAt: true,
  isActive: true,
} as const;

const PUBLIC_EVENT_SELECT = {
  id: true,
  organizerId: true,
  name: true,
  description: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;


type OrganizerDetail = Prisma.OrganizerGetPayload<{ select: typeof ORGANIZER_SELECT }>;
type EventDetail = Prisma.EventGetPayload<{ select: typeof EVENT_SELECT }>;
type TicketTierDetail = Prisma.TicketTierGetPayload<{ select: typeof TICKET_TIER_SELECT }>;
type PublicEventDetail = Prisma.EventGetPayload<{
  select: typeof PUBLIC_EVENT_SELECT & {
    ticketTiers: {
      where: Prisma.TicketTierWhereInput;
      orderBy: { id: 'asc' };
      select: typeof PUBLIC_TICKET_TIER_SELECT;
    };
  };
}>;
type OrganizerStatusDetail = {
  id: string;
  name: string;
  ownerId: number;
  isSuspended: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type OrganizerScope = {
  organizer: OrganizerDetail;
  isOwner: boolean;
  isStaff: boolean;
  isAdmin: boolean;
};

type PublicOrganizerLanding = {
  organizer: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'SUSPENDED';
    createdAt: Date;
    updatedAt: Date;
  };
  events: PublicEventDetail[];
  publishedEvents: PublicEventDetail[];
};

const getOrganizerScope = async (
  organizerId: string,
  actor: AuthenticatedUser
): Promise<OrganizerScope> => {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: {
      ...ORGANIZER_SELECT,
      memberships: {
        where: { userId: actor.id },
        select: { userId: true },
      },
    },
  });

  if (!organizer) {
    throw new HttpError(404, 'Organizer not found');
  }

  const { memberships, ...organizerData } = organizer;

  return {
    organizer: organizerData,
    isOwner: organizer.ownerId === actor.id,
    isStaff: memberships.length > 0,
    isAdmin: actor.role === Role.ADMIN,
  };
};

const assertOwnerOrAdmin = (scope: OrganizerScope, action: string) => {
  if (!scope.isAdmin && !scope.isOwner) {
    throw new HttpError(403, `You do not have permission to ${action} for this organizer`);
  }
};

const assertStaffOrOwnerOrAdmin = (scope: OrganizerScope, action: string) => {
  if (!scope.isAdmin && !scope.isOwner && !scope.isStaff) {
    throw new HttpError(403, `You do not have permission to ${action} for this organizer`);
  }
};

const assertOrganizerActive = (scope: OrganizerScope, action: string) => {
  if (!scope.isAdmin && scope.organizer.isSuspended) {
    throw new HttpError(403, `Cannot ${action} while the organizer is suspended`);
  }
};

const ensureEventInOrganizer = async (organizerId: string, eventId: string): Promise<{ id: string }> => {
  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId },
    select: { id: true },
  });

  if (event) {
    return event;
  }

  const eventExists = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (eventExists) {
    throw new HttpError(403, 'Forbidden: event is outside this organizer');
  }

  throw new HttpError(404, 'Event not found');
};

const ensureUniqueEventName = async (
  organizerId: string,
  name: string,
  excludeEventId?: string
): Promise<void> => {
  const duplicate = await prisma.event.findFirst({
    where: {
      organizerId,
      name,
      ...(excludeEventId ? { NOT: { id: excludeEventId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new HttpError(409, 'An event with this name already exists for this organizer');
  }
};

export const organizerService = {
  create: async (
    input: { name: string; ownerId?: number },
    actor: AuthenticatedUser
  ): Promise<OrganizerDetail> => {
    if (actor.role !== Role.ADMIN && actor.role !== Role.OWNER) {
      throw new HttpError(403, 'You do not have permission to create an organizer');
    }

    if (actor.role === Role.ADMIN && !input.ownerId) {
      throw new HttpError(400, 'ownerId is required when creating an organizer as an admin');
    }

    const ownerId = input.ownerId ?? actor.id;

    if (actor.role !== Role.ADMIN && ownerId !== actor.id) {
      throw new HttpError(403, 'You can only create an organizer for yourself');
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, role: true },
    });

    if (!owner) {
      throw new HttpError(404, 'Owner not found');
    }

    if (owner.role !== Role.OWNER) {
      throw new HttpError(400, 'Owner must have the OWNER role');
    }

    const existing = await prisma.organizer.findUnique({
      where: { ownerId },
      select: { id: true },
    });

    if (existing) {
      throw new HttpError(409, 'This owner already has an organizer');
    }

    return prisma.organizer.create({
      data: {
        name: input.name,
        ownerId,
      },
      select: ORGANIZER_SELECT,
    });
  },

  getById: async (organizerId: string, actor: AuthenticatedUser): Promise<OrganizerDetail> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view the organizer profile');
    return scope.organizer;
  },

  getPublicById: async (organizerId: string): Promise<PublicOrganizerLanding> => {
    const now = new Date();
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        name: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        events: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          select: {
            ...PUBLIC_EVENT_SELECT,
            ticketTiers: {
              where: {
                isActive: true,
                AND: [
                  { OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }] },
                  { OR: [{ salesEndAt: null }, { salesEndAt: { gte: now } }] },
                  { OR: [{ quantityTotal: null }, { quantitySold: { lt: prisma.ticketTier.fields.quantityTotal } }] },
                ],
              },
              orderBy: { id: 'asc' },
              select: PUBLIC_TICKET_TIER_SELECT,
            },
          },
        },
      },
    });

    if (!organizer) {
      throw new HttpError(404, 'Organizer not found');
    }

    if (organizer.isSuspended) {
      throw new HttpError(404, 'Organizer not found');
    }

    const { events, isSuspended, ...rest } = organizer;

    return {
      organizer: {
        ...rest,
        status: isSuspended ? 'SUSPENDED' : 'ACTIVE',
      },
      events,
      publishedEvents: events,
    };
  },

  update: async (
    organizerId: string,
    input: { name: string },
    actor: AuthenticatedUser
  ): Promise<OrganizerDetail> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'update the organizer profile');
    assertOrganizerActive(scope, 'update organizer profile');

    return prisma.organizer.update({
      where: { id: scope.organizer.id },
      data: {
        name: input.name,
      },
      select: ORGANIZER_SELECT,
    });
  },

  updateStatus: async (
    organizerId: string,
    status: 'active' | 'suspended',
    actor: AuthenticatedUser
  ): Promise<OrganizerStatusDetail> => {
    if (actor.role !== Role.ADMIN) {
      throw new HttpError(403, 'You do not have permission to update organizer status');
    }

    const suspendedAt = status === 'suspended' ? new Date() : null;

    const [organizer] = await prisma.$queryRaw<OrganizerStatusDetail[]>`
      UPDATE "Organizer"
      SET
        "isSuspended" = ${status === 'suspended'},
        "suspendedAt" = ${suspendedAt},
        "updatedAt" = NOW()
      WHERE id = ${organizerId}
      RETURNING
        id,
        name,
        "ownerId",
        "isSuspended",
        "suspendedAt",
        "createdAt",
        "updatedAt"
    `;

    if (!organizer) {
      throw new HttpError(404, 'Organizer not found');
    }

    return organizer;
  },

  remove: async (organizerId: string, actor: AuthenticatedUser): Promise<void> => {
    if (actor.role !== Role.ADMIN) {
      throw new HttpError(403, 'You do not have permission to delete organizers');
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { id: true },
    });

    if (!organizer) {
      throw new HttpError(404, 'Organizer not found');
    }

    await prisma.organizer.delete({
      where: { id: organizerId },
    });
  },

  listEvents: async (organizerId: string, actor: AuthenticatedUser): Promise<EventDetail[]> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertStaffOrOwnerOrAdmin(scope, 'view events');
    assertOrganizerActive(scope, 'view events');

    return prisma.event.findMany({
      where: {
        organizerId: scope.organizer.id,
      },
      orderBy: { createdAt: 'desc' },
      select: EVENT_SELECT,
    });
  },

  createEvent: async (
    organizerId: string,
    input: { name: string; description?: string | null; price: number; isPublished?: boolean },
    actor: AuthenticatedUser
  ): Promise<EventDetail> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'create events');
    assertOrganizerActive(scope, 'create events');
    await ensureUniqueEventName(scope.organizer.id, input.name);

    return prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          organizerId: scope.organizer.id,
          name: input.name,
          description: input.description ?? null,
          isPublished: input.isPublished ?? false,
        },
        select: EVENT_SELECT,
      });

      await tx.ticketTier.create({
        data: {
          eventId: createdEvent.id,
          name: 'General',
          price: new Prisma.Decimal(input.price),
        },
      });

      return createdEvent;
    });
  },

  updateEvent: async (
    organizerId: string,
    eventId: string,
    input: { name?: string; description?: string | null; price?: number; isPublished?: boolean },
    actor: AuthenticatedUser
  ): Promise<EventDetail> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'update events');
    assertOrganizerActive(scope, 'update events');

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: scope.organizer.id,
      },
      select: { id: true, name: true },
    });

    if (!event) {
      throw new HttpError(403, 'Forbidden: event is outside this organizer');
    }

    if (input.name && input.name !== event.name) {
      await ensureUniqueEventName(scope.organizer.id, input.name, event.id);
    }

    return prisma.$transaction(async (tx) => {
      const updates: Prisma.EventUpdateInput = {};

      if (input.name !== undefined) {
        updates.name = input.name;
      }

      if (input.description !== undefined) {
        updates.description = input.description;
      }

      if (input.isPublished !== undefined) {
        updates.isPublished = input.isPublished;
      }

      const updatedEvent = await tx.event.update({
        where: {
          id: event.id,
          organizerId: scope.organizer.id,
        },
        data: updates,
        select: EVENT_SELECT,
      });

      if (input.price !== undefined) {
        const currentTier = await tx.ticketTier.findFirst({
          where: { eventId: event.id },
          orderBy: { id: 'asc' },
          select: { id: true },
        });

        if (currentTier) {
          await tx.ticketTier.update({
            where: { id: currentTier.id },
            data: { price: new Prisma.Decimal(input.price) },
          });
        } else {
          await tx.ticketTier.create({
            data: {
              eventId: event.id,
              name: 'General',
              price: new Prisma.Decimal(input.price),
            },
          });
        }
      }

      return updatedEvent;
    });
  },

  removeEvent: async (organizerId: string, eventId: string, actor: AuthenticatedUser): Promise<void> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'delete events');
    assertOrganizerActive(scope, 'delete events');

    const event = await ensureEventInOrganizer(scope.organizer.id, eventId);

    await prisma.event.delete({
      where: {
        id: event.id,
        organizerId: scope.organizer.id,
      },
    });
  },

  listTicketTiers: async (
    organizerId: string,
    eventId: string,
    actor: AuthenticatedUser
  ): Promise<TicketTierDetail[]> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'view ticket tiers');
    assertOrganizerActive(scope, 'view ticket tiers');
    const event = await ensureEventInOrganizer(scope.organizer.id, eventId);

    return prisma.ticketTier.findMany({
      where: { eventId: event.id },
      orderBy: { id: 'asc' },
      select: TICKET_TIER_SELECT,
    });
  },

  createTicketTier: async (
    organizerId: string,
    eventId: string,
    input: {
      name: string;
      description?: string | null;
      price: number;
      currency?: string;
      quantityTotal?: number;
      quantitySold?: number;
      salesStartAt?: Date;
      salesEndAt?: Date;
      isActive?: boolean;
    },
    actor: AuthenticatedUser
  ): Promise<TicketTierDetail> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'create ticket tiers');
    assertOrganizerActive(scope, 'create ticket tiers');
    const event = await ensureEventInOrganizer(scope.organizer.id, eventId);

    if (input.quantityTotal !== undefined && (input.quantitySold ?? 0) > input.quantityTotal) {
      throw new HttpError(400, 'quantitySold cannot be greater than quantityTotal');
    }

    try {
      return await prisma.ticketTier.create({
        data: {
          eventId: event.id,
          name: input.name,
          description: input.description ?? null,
          price: new Prisma.Decimal(input.price),
          currency: input.currency ?? 'usd',
          quantityTotal: input.quantityTotal,
          quantitySold: input.quantitySold ?? 0,
          salesStartAt: input.salesStartAt,
          salesEndAt: input.salesEndAt,
          isActive: input.isActive ?? true,
        },
        select: TICKET_TIER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'A ticket tier with this name already exists for this event');
      }
      throw error;
    }
  },

  updateTicketTier: async (
    organizerId: string,
    eventId: string,
    ticketTierId: number,
    input: {
      name?: string;
      description?: string | null;
      price?: number;
      currency?: string;
      quantityTotal?: number;
      quantitySold?: number;
      salesStartAt?: Date;
      salesEndAt?: Date;
      isActive?: boolean;
    },
    actor: AuthenticatedUser
  ): Promise<TicketTierDetail> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'update ticket tiers');
    assertOrganizerActive(scope, 'update ticket tiers');
    const event = await ensureEventInOrganizer(scope.organizer.id, eventId);

    const existing = await prisma.ticketTier.findFirst({
      where: {
        id: ticketTierId,
        event: {
          id: event.id,
          organizerId: scope.organizer.id,
        },
      },
      select: { id: true, quantityTotal: true, quantitySold: true },
    });

    if (!existing) {
      const tierExists = await prisma.ticketTier.findUnique({
        where: { id: ticketTierId },
        select: { id: true },
      });

      if (tierExists) {
        throw new HttpError(403, 'Forbidden: ticket tier is outside this organizer event');
      }

      throw new HttpError(404, 'Ticket tier not found');
    }

    const finalQuantityTotal = input.quantityTotal ?? existing.quantityTotal;
    const finalQuantitySold = input.quantitySold ?? existing.quantitySold;

    if (finalQuantityTotal !== null && finalQuantitySold > finalQuantityTotal) {
      throw new HttpError(400, 'quantitySold cannot be greater than quantityTotal');
    }

    const updates: Prisma.TicketTierUpdateInput = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.price !== undefined) updates.price = new Prisma.Decimal(input.price);
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.quantityTotal !== undefined) updates.quantityTotal = input.quantityTotal;
    if (input.quantitySold !== undefined) updates.quantitySold = input.quantitySold;
    if (input.salesStartAt !== undefined) updates.salesStartAt = input.salesStartAt;
    if (input.salesEndAt !== undefined) updates.salesEndAt = input.salesEndAt;
    if (input.isActive !== undefined) updates.isActive = input.isActive;

    try {
      return await prisma.ticketTier.update({
        where: { id: existing.id },
        data: updates,
        select: TICKET_TIER_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'A ticket tier with this name already exists for this event');
      }
      throw error;
    }
  },

  listStaff: async (
    organizerId: string,
    actor: AuthenticatedUser
  ): Promise<
    Array<{
      assignedAt: Date;
      user: { id: number; email: string; name: string | null; role: Role };
    }>
  > => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'view staff assignments');
    assertOrganizerActive(scope, 'view staff assignments');

    return prisma.organizerMembership.findMany({
      where: { organizerId: scope.organizer.id },
      select: {
        assignedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
  },

  listStaffCandidates: async (
    organizerId: string,
    search: string,
    actor: AuthenticatedUser,
    limit = 10
  ): Promise<Array<{ id: number; email: string; name: string | null; role: Role }>> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'search staff candidates');
    assertOrganizerActive(scope, 'search staff candidates');

    const normalizedSearch = search.trim().toLowerCase();

    if (normalizedSearch.length < 2) {
      return [];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 20);

    return prisma.user.findMany({
      where: {
        role: {
          in: [Role.USER, Role.STAFF],
        },
        email: {
          contains: normalizedSearch,
          mode: 'insensitive',
        },
        id: {
          not: scope.organizer.ownerId,
        },
        organizerMemberships: {
          none: {
            organizerId: scope.organizer.id,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        email: 'asc',
      },
      take: safeLimit,
    });
  },

  assignStaff: async (
    organizerId: string,
    userId: number,
    actor: AuthenticatedUser
  ): Promise<{ organizerId: string; userId: number; assignedAt: Date }> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'assign staff');
    assertOrganizerActive(scope, 'assign staff');

    if (userId === scope.organizer.ownerId) {
      throw new HttpError(400, 'The owner cannot be assigned as staff');
    }

    const staffUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!staffUser) {
      throw new HttpError(404, 'User not found');
    }

    if (staffUser.role === Role.OWNER || staffUser.role === Role.ADMIN) {
      throw new HttpError(400, 'Only USER or STAFF accounts can be assigned as staff');
    }

    const assignment = await prisma.$transaction(async (tx) => {
      if (staffUser.role === Role.USER || staffUser.role === Role.STAFF) {
        await tx.user.update({
          where: { id: staffUser.id },
          data: {
            role: Role.STAFF,
            permissions: resolvePermissions(Role.STAFF),
          },
        });
      }

      return tx.organizerMembership.upsert({
        where: {
          organizerId_userId: {
            organizerId: scope.organizer.id,
            userId: staffUser.id,
          },
        },
        update: {
          role: OrganizerRole.STAFF,
        },
        create: {
          organizerId: scope.organizer.id,
          userId: staffUser.id,
          role: OrganizerRole.STAFF,
        },
      });
    });

    if (cache.isConnectedToRedis()) {
      await cache.del(`user:${staffUser.id}`);
    }

    return assignment;
  },

  removeStaff: async (organizerId: string, userId: number, actor: AuthenticatedUser): Promise<void> => {
    const scope = await getOrganizerScope(organizerId, actor);
    assertOwnerOrAdmin(scope, 'remove staff');
    assertOrganizerActive(scope, 'remove staff');

    const existing = await prisma.organizerMembership.findUnique({
      where: {
        organizerId_userId: {
          organizerId: scope.organizer.id,
          userId,
        },
      },
    });

    if (!existing) {
      throw new HttpError(404, 'Staff assignment not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.organizerMembership.delete({
        where: {
          organizerId_userId: {
            organizerId: scope.organizer.id,
            userId,
          },
        },
      });

      const remainingAssignments = await tx.organizerMembership.count({
        where: { userId },
      });

      if (remainingAssignments === 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            role: Role.USER,
            permissions: resolvePermissions(Role.USER),
          },
        });
      }
    });

    if (cache.isConnectedToRedis()) {
      await cache.del(`user:${userId}`);
    }
  },
};
