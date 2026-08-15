import { BookingStatus, Prisma, Role } from '@prisma/client';

import {
  CreateBookingInput,
  CreatePublicBookingInput,
  UpdateBookingInput,
  ListBookingsQuery,
} from '../schemas/booking.schema';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { AuthenticatedUser } from '../types/user';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { resolveOrganizerTenantScope } from './tenant-scope.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CACHE_TTL_SECONDS = 60;
const BOOKING_CACHE_TTL_SECONDS = 60 * 5;

const BOOKING_STATUS_VALUES = new Set(Object.values(BookingStatus));

const bookingListInclude = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  event: {
    select: {
      id: true,
      name: true,
      isPublished: true,
      organizer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  payments: {
    select: {
      id: true,
      stripeCheckoutSessionId: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
    },
  },
} as const;

const bookingDetailInclude = {
  payments: {
    orderBy: { createdAt: 'desc' },
  },
  items: {
    select: {
      id: true,
      ticketTierId: true,
      tierNameSnapshot: true,
      unitPriceSnapshot: true,
      quantity: true,
      lineTotal: true,
    },
  },
  tickets: {
    select: {
      id: true,
      code: true,
      qrPayload: true,
      attendeeName: true,
      attendeeEmail: true,
      status: true,
      issuedAt: true,
      checkedInAt: true,
      voidedAt: true,
      ticketTierId: true,
    },
    orderBy: { issuedAt: 'asc' },
  },
  event: {
    select: {
      id: true,
      name: true,
      description: true,
      isPublished: true,
      organizer: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

type BookingListItem = Prisma.BookingGetPayload<{ include: typeof bookingListInclude }>;
type BookingDetail = Prisma.BookingGetPayload<{ include: typeof bookingDetailInclude }>;
type PublicBookingSubmission = {
  id: number;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  eventId: string | null;
  eventName: string | null;
  ticketTierId: number;
  tierName: string;
  userId: number | null;
  bookingDate: Date | null;
  bookingTime: string | null;
  quantity: number;
  guestCount: number | null;
  notes: string | null;
  totalAmount: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  currency: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ListBookingsFilters = Partial<ListBookingsQuery> & {
  search?: string;
};

type BookingListScope = {
  where: Prisma.BookingWhereInput;
  cacheScope: string;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

const normalizePagination = (page: number, limit: number) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const parseDate = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  return undefined;
};

const normalizeStatusFilter = (status: unknown): BookingStatus[] | undefined => {
  if (!status) {
    return undefined;
  }

  const statuses = Array.isArray(status) ? status : String(status).split(',');

  const normalized = statuses
    .map((value) => value?.toString().trim())
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toUpperCase())
    .filter((value): value is BookingStatus => BOOKING_STATUS_VALUES.has(value as BookingStatus));

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeFilters = (filters?: Partial<ListBookingsQuery>): Partial<ListBookingsQuery> | undefined => {
  if (!filters) {
    return undefined;
  }

  const normalized: Partial<ListBookingsQuery> = {};

  const status = normalizeStatusFilter((filters as { status?: unknown }).status);
  if (status) {
    normalized.status = status;
  }

  if (typeof filters.eventName === 'string') {
    const trimmed = filters.eventName.trim();
    if (trimmed) {
      normalized.eventName = trimmed;
    }
  }

  const createdFrom = parseDate(
    (filters as { createdFrom?: unknown; checkInFrom?: unknown }).createdFrom ??
      (filters as { checkInFrom?: unknown }).checkInFrom
  );
  if (createdFrom) {
    (normalized as ListBookingsFilters & { createdFrom?: Date }).createdFrom = createdFrom;
  }

  const createdTo = parseDate(
    (filters as { createdTo?: unknown; checkInTo?: unknown }).createdTo ??
      (filters as { checkInTo?: unknown }).checkInTo
  );
  if (createdTo) {
    (normalized as ListBookingsFilters & { createdTo?: Date }).createdTo = createdTo;
  }

  const updatedFrom = parseDate(
    (filters as { updatedFrom?: unknown; checkOutFrom?: unknown }).updatedFrom ??
      (filters as { checkOutFrom?: unknown }).checkOutFrom
  );
  if (updatedFrom) {
    (normalized as ListBookingsFilters & { updatedFrom?: Date }).updatedFrom = updatedFrom;
  }

  const updatedTo = parseDate(
    (filters as { updatedTo?: unknown; checkOutTo?: unknown }).updatedTo ??
      (filters as { checkOutTo?: unknown }).checkOutTo
  );
  if (updatedTo) {
    (normalized as ListBookingsFilters & { updatedTo?: Date }).updatedTo = updatedTo;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeListFilters = (filters?: ListBookingsFilters): ListBookingsFilters | undefined => {
  if (!filters) {
    return undefined;
  }

  const normalized = normalizeFilters(filters);
  const search =
    typeof filters.search === 'string'
      ? filters.search.trim()
      : undefined;

  if (!normalized && !search) {
    return undefined;
  }

  return {
    ...(normalized ?? {}),
    ...(search ? { search } : {}),
  };
};

const assertTierBookable = (tier: {
  isActive: boolean;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  quantityTotal: number | null;
  quantitySold: number;
}, quantity: number) => {
  if (!tier.isActive) {
    throw new HttpError(400, 'Selected ticket tier is not active');
  }

  const now = new Date();
  if (tier.salesStartAt && tier.salesStartAt > now) {
    throw new HttpError(400, 'Ticket tier sales have not started');
  }

  if (tier.salesEndAt && tier.salesEndAt < now) {
    throw new HttpError(400, 'Ticket tier sales have ended');
  }

  if (tier.quantityTotal !== null) {
    const available = tier.quantityTotal - tier.quantitySold;
    if (quantity > available) {
      throw new HttpError(400, 'Insufficient ticket inventory for this tier');
    }
  }
};

const createBookingWithTier = async (input: {
  eventId: string;
  ticketTierId: number;
  quantity: number;
  userId: number | null;
  fullName: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  requirePublished: boolean;
}) => {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      name: true,
      organizerId: true,
      isPublished: true,
      organizer: {
        select: {
          isSuspended: true,
        },
      },
    },
  });

  if (!event) {
    throw new HttpError(404, 'Event not found');
  }

  if (input.requirePublished && !event.isPublished) {
    throw new HttpError(403, 'This event is not available for booking');
  }

  if (event.organizer.isSuspended) {
    throw new HttpError(403, 'This organizer is currently suspended');
  }

  const tier = await prisma.ticketTier.findUnique({
    where: { id: input.ticketTierId },
    select: {
      id: true,
      eventId: true,
      name: true,
      price: true,
      currency: true,
      quantityTotal: true,
      quantitySold: true,
      salesStartAt: true,
      salesEndAt: true,
      isActive: true,
    },
  });

  if (!tier) {
    throw new HttpError(404, 'Ticket tier not found');
  }

  if (tier.eventId !== event.id) {
    throw new HttpError(400, 'Selected ticket tier does not belong to this event');
  }

  assertTierBookable(tier, input.quantity);

  const lineTotal = tier.price.mul(input.quantity);

  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.$executeRaw`
      UPDATE "TicketTier"
      SET "quantitySold" = "quantitySold" + ${input.quantity}, "updatedAt" = NOW()
      WHERE "id" = ${tier.id}
        AND "eventId" = ${event.id}::uuid
        AND "isActive" = true
        AND ("salesStartAt" IS NULL OR "salesStartAt" <= NOW())
        AND ("salesEndAt" IS NULL OR "salesEndAt" >= NOW())
        AND ("quantityTotal" IS NULL OR "quantitySold" + ${input.quantity} <= "quantityTotal")
    `;

    if (updated === 0) {
      throw new HttpError(400, 'Selected ticket tier is sold out or has insufficient inventory');
    }

    const created = await tx.booking.create({
      data: {
        userId: input.userId,
        eventId: event.id,
        organizerId: event.organizerId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        subtotalAmount: lineTotal,
        totalAmount: lineTotal,
        currency: tier.currency,
        status: BookingStatus.PENDING,
      },
    });

    await tx.bookingItem.create({
      data: {
        bookingId: created.id,
        ticketTierId: tier.id,
        tierNameSnapshot: tier.name,
        unitPriceSnapshot: tier.price,
        quantity: input.quantity,
        lineTotal,
      },
    });

    return created;
  });

  return { booking, event, tier, quantity: input.quantity, lineTotal };
};

export const releaseBookingInventoryReservation = async (
  tx: Prisma.TransactionClient,
  bookingId: number
) => {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      cancelledAt: true,
      items: {
        select: {
          ticketTierId: true,
          quantity: true,
        },
      },
    },
  });

  if (!booking || booking.cancelledAt || booking.items.length === 0) {
    return false;
  }

  const reservedByTier = new Map<number, number>();

  for (const item of booking.items) {
    reservedByTier.set(item.ticketTierId, (reservedByTier.get(item.ticketTierId) ?? 0) + item.quantity);
  }

  for (const [ticketTierId, quantity] of reservedByTier.entries()) {
    await tx.$executeRaw`
      UPDATE "TicketTier"
      SET "quantitySold" = GREATEST("quantitySold" - ${quantity}, 0), "updatedAt" = NOW()
      WHERE "id" = ${ticketTierId}
    `;
  }

  return true;
};

type UserBookingHistoryItem = {
  id: number;
  eventId: string | null;
  eventName: string | null;
  bookingDate: Date | null;
  bookingTime: string | null;
  quantity: number;
  totalPrice: Prisma.Decimal | null;
  currency: string;
  status: BookingStatus;
  createdAt: Date;
};

const resolveBookingListScope = async (actor: AuthenticatedUser): Promise<BookingListScope> => {
  if (actor.role === Role.ADMIN) {
    return {
      where: {},
      cacheScope: 'all',
    };
  }

  if (actor.role === Role.USER) {
    return {
      where: { userId: actor.id },
      cacheScope: `user:${actor.id}`,
    };
  }

  if (actor.role === Role.OWNER || actor.role === Role.STAFF) {
    const organizerScope = await resolveOrganizerTenantScope({ prisma }, actor, {
      allowAdminPlatform: false,
      ownerNoOrganizerMessage: 'Owner bookings require an owned organizer',
      staffNoAssignmentsMessage: 'Staff bookings require at least one organizer assignment',
      forbiddenMessage: 'You do not have permission to access these bookings',
    });

    if (organizerScope.organizerIds.length === 1) {
      const cacheScope =
        actor.role === Role.STAFF
          ? `organizers:${organizerScope.organizerIds[0]}`
          : organizerScope.cacheScope;

      return {
      where: { organizerId: organizerScope.organizerIds[0] },
        cacheScope,
      };
    }

    return {
      where: { organizerId: { in: organizerScope.organizerIds } },
      cacheScope: `organizers:${organizerScope.organizerIds.slice().sort().join(',')}`,
    };
  }

  return {
    where: { userId: actor.id },
    cacheScope: `user:${actor.id}`,
  };
};

const canAccessBookingDetail = async (
  actor: AuthenticatedUser,
  booking: BookingDetail
): Promise<boolean> => {
  if (actor.role === Role.ADMIN) {
    return true;
  }

  if (actor.role === Role.USER) {
    return booking.userId === actor.id;
  }

  if (actor.role === Role.OWNER || actor.role === Role.STAFF) {
    const organizerScope = await resolveOrganizerTenantScope({ prisma }, actor, {
      allowAdminPlatform: false,
      ownerNoOrganizerMessage: 'Owner bookings require an owned organizer',
      staffNoAssignmentsMessage: 'Staff bookings require at least one organizer assignment',
      forbiddenMessage: 'You do not have permission to access these bookings',
    });

    const bookingOrganizerId = booking.event?.organizer?.id;
    if (!bookingOrganizerId) {
      return false;
    }

    return organizerScope.organizerIds.includes(bookingOrganizerId);
  }

  return booking.userId === actor.id;
};

const invalidateBookingCollections = async (userId: number) => {
  if (!cache.isConnectedToRedis()) {
    return;
  }

  await Promise.all([
    cache.delByPrefix(`bookings:${userId}`),
    cache.delByPrefix(`bookings:all`),
  ]);
};

export const bookingService = {
  createPublicTicketBooking: async (
    input: CreatePublicBookingInput,
    actor?: AuthenticatedUser | null,
    organizerId?: string
  ): Promise<PublicBookingSubmission> => {
    if (!actor || actor.role !== Role.USER) {
      throw new HttpError(401, 'Sign in with a user account to continue to ticket checkout');
    }

    const bookingDate = new Date(`${input.bookingDate}T00:00:00.000Z`);

    if (Number.isNaN(bookingDate.getTime())) {
      throw new HttpError(400, 'Booking date must be a valid date');
    }

    const eventScope = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { organizerId: true },
    });

    if (!eventScope) {
      throw new HttpError(404, 'Event not found');
    }

    if (organizerId && eventScope.organizerId !== organizerId) {
      throw new HttpError(404, 'Event not found for this organizer');
    }

    const fullName = input.fullName?.trim() || actor?.name?.trim() || actor?.email?.trim();
    const email = input.email?.trim() || actor?.email?.trim();
    const phone = input.phone?.trim() || null;

    if (!fullName || !email) {
      throw new HttpError(400, 'A full name and email address are required');
    }

    const { booking, event, tier, quantity, lineTotal } = await createBookingWithTier({
      eventId: input.eventId,
      ticketTierId: input.ticketTierId,
      quantity: input.quantity,
      userId: actor?.id ?? null,
      fullName,
      email,
      phone,
      notes: input.notes ?? null,
      requirePublished: true,
    });

    return {
      id: booking.id,
      fullName: booking.fullName ?? fullName,
      email: booking.email ?? email,
      phone: booking.phone ?? phone ?? '',
      eventId: booking.eventId,
      eventName: event.name,
      ticketTierId: tier.id,
      tierName: tier.name,
      userId: booking.userId,
      bookingDate,
      bookingTime: input.bookingTime,
      quantity,
      guestCount: input.guestCount ?? quantity,
      notes: booking.notes ?? null,
      totalAmount: lineTotal,
      totalPrice: lineTotal,
      currency: tier.currency,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  },

  list: async (
    actor: AuthenticatedUser,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT,
    filters?: ListBookingsFilters
  ): Promise<PaginatedResponse<BookingListItem>> => {
    try {
      const { page: currentPage, limit: currentLimit } = normalizePagination(page, limit);
      const skip = (currentPage - 1) * currentLimit;
      const scope = await resolveBookingListScope(actor);
      const normalizedFilters = normalizeListFilters(filters);

      const filterString = normalizedFilters ? JSON.stringify(normalizedFilters) : '';
      const cacheKey = `bookings:${scope.cacheScope}:${currentPage}:${currentLimit}:${filterString}`;

      if (cache.isConnectedToRedis()) {
        const cached = await cache.get<PaginatedResponse<BookingListItem>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const whereClauses: Prisma.BookingWhereInput[] = [];

      if (Object.keys(scope.where).length > 0) {
        whereClauses.push(scope.where);
      }

      if (normalizedFilters) {
        if (normalizedFilters.status && normalizedFilters.status.length > 0) {
          whereClauses.push({ status: { in: normalizedFilters.status } });
        }

        if (normalizedFilters.eventName) {
          whereClauses.push({
            event: {
              name: { contains: normalizedFilters.eventName, mode: 'insensitive' },
            },
          });
        }

        const createdFrom = (normalizedFilters as ListBookingsFilters & { createdFrom?: Date }).createdFrom;
        const createdTo = (normalizedFilters as ListBookingsFilters & { createdTo?: Date }).createdTo;
        const updatedFrom = (normalizedFilters as ListBookingsFilters & { updatedFrom?: Date }).updatedFrom;
        const updatedTo = (normalizedFilters as ListBookingsFilters & { updatedTo?: Date }).updatedTo;

        if (createdFrom || createdTo) {
          whereClauses.push({
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          });
        }

        if (updatedFrom || updatedTo) {
          whereClauses.push({
            updatedAt: {
              ...(updatedFrom ? { gte: updatedFrom } : {}),
              ...(updatedTo ? { lte: updatedTo } : {}),
            },
          });
        }
      }

      if (normalizedFilters?.search) {
        whereClauses.push({
          OR: [
            { fullName: { contains: normalizedFilters.search, mode: 'insensitive' } },
            { email: { contains: normalizedFilters.search, mode: 'insensitive' } },
            { phone: { contains: normalizedFilters.search, mode: 'insensitive' } },
            {
              event: {
                name: { contains: normalizedFilters.search, mode: 'insensitive' },
              },
            },
          ],
        });
      }

      const where: Prisma.BookingWhereInput =
        whereClauses.length === 0 ? {} : whereClauses.length === 1 ? whereClauses[0] : { AND: whereClauses };

      const [bookings, totalItems] = await prisma.$transaction([
        prisma.booking.findMany({
          where,
          include: bookingListInclude,
          skip,
          take: currentLimit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.booking.count({ where }),
      ]);

      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit);

      const response: PaginatedResponse<BookingListItem> = {
        data: bookings,
        meta: {
          page: currentPage,
          limit: currentLimit,
          totalItems,
          totalPages,
        },
      };

      if (cache.isConnectedToRedis()) {
        await cache.set(cacheKey, response, CACHE_TTL_SECONDS);
      }

      return response;
    } catch (error) {
      logger.error({ err: error }, 'Failed to list bookings');
      throw error;
    }
  },

  listUserHistory: async (
    actor: AuthenticatedUser,
    page: number = DEFAULT_PAGE,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedResponse<UserBookingHistoryItem>> => {
    if (actor.role !== Role.USER) {
      throw new HttpError(403, 'Booking history is only available for users');
    }

    const { page: currentPage, limit: currentLimit } = normalizePagination(page, limit);
    const skip = (currentPage - 1) * currentLimit;

    const where: Prisma.BookingWhereInput = { userId: actor.id };
    const cacheKey = `bookings:user-history:${actor.id}:${currentPage}:${currentLimit}`;

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<PaginatedResponse<UserBookingHistoryItem>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const [bookings, totalItems] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          eventId: true,
          totalAmount: true,
          currency: true,
          status: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
            },
          },
          event: {
            select: {
              name: true,
            },
          },
        },
        skip,
        take: currentLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.booking.count({ where }),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / currentLimit);

    const response: PaginatedResponse<UserBookingHistoryItem> = {
      data: bookings.map((booking) => ({
        id: booking.id,
        eventId: booking.eventId,
        eventName: booking.event?.name ?? null,
        bookingDate: booking.createdAt,
        bookingTime: null,
        quantity: booking.items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: booking.totalAmount,
        currency: booking.currency,
        status: booking.status,
        createdAt: booking.createdAt,
      })),
      meta: {
        page: currentPage,
        limit: currentLimit,
        totalItems,
        totalPages,
      },
    };

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, response, CACHE_TTL_SECONDS);
    }

    return response;
  },

  getById: async (bookingId: number, actor: AuthenticatedUser): Promise<BookingDetail> => {
    const cacheKey = `booking:${bookingId}`;

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<BookingDetail>(cacheKey);
      if (cached) {
        if (!(await canAccessBookingDetail(actor, cached))) {
          throw new HttpError(403, 'Forbidden');
        }

        return cached;
      }
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingDetailInclude,
    });

    if (!booking) {
      throw new HttpError(404, 'Booking not found');
    }

    if (!(await canAccessBookingDetail(actor, booking))) {
      throw new HttpError(403, 'Forbidden');
    }

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, booking, BOOKING_CACHE_TTL_SECONDS);
    }

    return booking;
  },

  createProtectedBooking: async (input: CreateBookingInput, user: AuthenticatedUser) => {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: {
        id: true,
        organizerId: true,
        isPublished: true,
      },
    });

    if (!event) {
      throw new HttpError(404, 'Event not found');
    }

    if (user.role === Role.OWNER || user.role === Role.STAFF) {
      const organizerScope = await resolveOrganizerTenantScope({ prisma }, user, {
        allowAdminPlatform: false,
        ownerNoOrganizerMessage: 'Owner bookings require an owned organizer',
        staffNoAssignmentsMessage: 'Staff bookings require at least one organizer assignment',
        forbiddenMessage: 'You do not have permission to create bookings for this organizer',
      });

      if (!organizerScope.organizerIds.includes(event.organizerId)) {
        throw new HttpError(403, 'You do not have permission to create bookings for this organizer');
      }
    }

    if (user.role === Role.USER && !event.isPublished) {
      throw new HttpError(403, 'You are not allowed to book an unpublished event');
    }

    const fullName = input.fullName?.trim() || user.name?.trim() || user.email;
    const email = user.role === Role.USER ? user.email : input.email?.trim() || user.email;
    const phone = input.phone?.trim() || null;

    const { booking } = await createBookingWithTier({
      eventId: input.eventId,
      ticketTierId: input.ticketTierId,
      quantity: input.quantity,
      userId: user.id,
      fullName,
      email,
      phone,
      notes: input.notes ?? null,
      requirePublished: user.role === Role.USER,
    });

    if (cache.isConnectedToRedis()) {
      await invalidateBookingCollections(user.id);
    }

    return booking;
  },

  update: async (bookingId: number, input: UpdateBookingInput, user: AuthenticatedUser) => {
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingDetailInclude,
    });

    if (!existing) {
      throw new HttpError(404, 'Booking not found');
    }

    if (!(await canAccessBookingDetail(user, existing))) {
      throw new HttpError(403, 'Forbidden');
    }

    if (input.status && user.role === Role.USER) {
      throw new HttpError(403, 'You do not have permission to update booking status');
    }

    if (input.status === BookingStatus.CONFIRMED) {
      throw new HttpError(403, 'Only Stripe webhook reconciliation can confirm a booking');
    }

    const updateData: Prisma.BookingUpdateInput = {};

    if (input.status) {
      updateData.status = input.status;
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpError(400, 'No valid booking update fields provided');
    }

    const booking = await prisma.$transaction(async (tx) => {
      if (input.status === BookingStatus.CANCELLED) {
        const releasedInventory = await releaseBookingInventoryReservation(tx, bookingId);
        updateData.cancelledAt = existing.cancelledAt ?? (releasedInventory ? new Date() : existing.cancelledAt);
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: updateData,
      });
    });

    if (cache.isConnectedToRedis()) {
      const operations: Promise<unknown>[] = [cache.del(`booking:${bookingId}`)];

      if (existing.userId) {
        operations.push(invalidateBookingCollections(existing.userId));
      }

      await Promise.all(operations);
    }

    return booking;
  },

  remove: async (bookingId: number) => {
    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      throw new HttpError(404, 'Booking not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      await releaseBookingInventoryReservation(tx, bookingId);

      await tx.payment.deleteMany({
        where: { bookingId },
      });

      return tx.booking.delete({
        where: { id: bookingId },
      });
    });

    if (cache.isConnectedToRedis()) {
      const cacheOperations = [cache.del(`booking:${bookingId}`)];

      if (result.userId) {
        cacheOperations.push(invalidateBookingCollections(result.userId));
        cacheOperations.push(cache.delByPrefix(`payments:${result.userId}`));
      }

      await Promise.all(cacheOperations);
    }

    return result;
  },
};
