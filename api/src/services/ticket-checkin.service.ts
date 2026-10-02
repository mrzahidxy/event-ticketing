import {
  BookingStatus,
  CheckinSource,
  PaymentStatus,
  Prisma,
  PrismaClient,
  Role,
  TicketStatus,
} from '@prisma/client';

import type { AuthenticatedUser } from '../types/user';
import { resolveOrganizerTenantScope } from './tenant-scope.service';
import { HttpError } from '../utils/http-error';

export const CHECKIN_GUARD_TTL_SECONDS = 10;

type CheckInPrisma = Pick<
  PrismaClient,
  '$transaction' | 'ticket' | 'organizer' | 'organizerMembership'
>;

type CheckInCache = {
  setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean>;
};

type CheckInDependencies = {
  prisma: CheckInPrisma;
  cache: CheckInCache;
};

const isValidTicketForCheckIn = (ticket: {
  status: TicketStatus;
  checkedInAt: Date | null;
  voidedAt: Date | null;
  booking: { status: BookingStatus; payments: Array<{ id: number }> };
}) =>
  ticket.status === TicketStatus.ISSUED &&
  ticket.checkedInAt === null &&
  ticket.voidedAt === null &&
  ticket.booking.status === BookingStatus.CONFIRMED &&
  ticket.booking.payments.length > 0;

export const createTicketCheckInService = (deps: CheckInDependencies) => ({
  checkIn: async (qrPayload: string, actor: AuthenticatedUser) => {
    if (actor.role !== Role.STAFF && actor.role !== Role.OWNER) {
      throw new HttpError(403, 'Only staff or organizer owners can check in tickets');
    }

    const organizerScope = await resolveOrganizerTenantScope(
      { prisma: deps.prisma },
      actor,
      {
        allowAdminPlatform: false,
        ownerNoOrganizerMessage: 'Owner check-in requires an owned organizer',
        staffNoAssignmentsMessage: 'Staff check-in requires an organizer assignment',
        forbiddenMessage: 'You do not have permission to check in tickets for this organizer',
      }
    );

    const ticket = await deps.prisma.ticket.findFirst({
      where: {
        qrPayload,
        event: { organizerId: { in: organizerScope.organizerIds } },
      },
      include: {
        booking: {
          select: {
            status: true,
            payments: {
              where: { status: PaymentStatus.SUCCEEDED },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      // Keep unknown and cross-tenant tokens indistinguishable.
      throw new HttpError(404, 'Ticket not found');
    }

    if (
      ticket.status !== TicketStatus.CHECKED_IN &&
      !isValidTicketForCheckIn(ticket)
    ) {
      throw new HttpError(422, 'Ticket is not valid for check-in');
    }

    let acquired: boolean;
    try {
      acquired = await deps.cache.setIfNotExists(
        `ticket-checkin:${ticket.id}`,
        '1',
        CHECKIN_GUARD_TTL_SECONDS
      );
    } catch {
      // Fail closed when Redis cannot confirm the guard. PostgreSQL remains the
      // durable authority and independently rejects repeated check-ins.
      throw new HttpError(503, 'Ticket check-in is temporarily unavailable');
    }

    if (!acquired) {
      throw new HttpError(409, 'Ticket has already been scanned');
    }

    if (ticket.status === TicketStatus.CHECKED_IN || ticket.checkedInAt !== null) {
      throw new HttpError(409, 'Ticket has already been checked in');
    }

    const checkedInAt = new Date();

    try {
      return await deps.prisma.$transaction(async (tx) => {
        const updated = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: TicketStatus.ISSUED,
            checkedInAt: null,
            voidedAt: null,
            booking: {
              is: {
                status: BookingStatus.CONFIRMED,
                payments: { some: { status: PaymentStatus.SUCCEEDED } },
              },
            },
          },
          data: {
            status: TicketStatus.CHECKED_IN,
            checkedInAt,
          },
        });

        if (updated.count !== 1) {
          throw new HttpError(409, 'Ticket has already been checked in or is no longer valid');
        }

        const checkIn = await tx.ticketCheckin.create({
          data: {
            ticketId: ticket.id,
            checkedInByUserId: actor.id,
            checkedInAt,
            scanSource: CheckinSource.QR,
          },
          select: {
            id: true,
            ticketId: true,
            checkedInByUserId: true,
            checkedInAt: true,
            scanSource: true,
          },
        });

        return {
          ticket: {
            id: ticket.id,
            status: TicketStatus.CHECKED_IN,
            checkedInAt,
          },
          checkIn,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'Ticket has already been checked in');
      }

      throw error;
    }
  },
});
