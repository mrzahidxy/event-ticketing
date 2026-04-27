import { Prisma, Role } from '@prisma/client';

import { prisma } from '../utils/prisma';
import { HttpError } from '../utils/http-error';

type OrganizerDirectoryRow = {
  organizerId: string;
  organizerName: string;
  ownerId: number;
  ownerEmail: string;
  ownerName: string | null;
  isSuspended: boolean;
  createdAt: Date;
  staffCount: number | null;
  eventCount: number | null;
};

type AuditLogEntry = {
  id: string;
  scope: 'system' | 'organizer';
  organizerId: string | null;
  action: string;
  actorLabel: string;
  actorType: 'system' | 'user';
  occurredAt: string;
  metadata: Record<string, unknown>;
};

type OrganizerActivityBase = {
  organizerId: string;
  organizerName: string;
  ownerId: number;
  ownerEmail: string;
  ownerName: string | null;
  createdAt: Date;
  updatedAt: Date;
  isSuspended: boolean;
  suspendedAt: Date | null;
};

type SystemOverviewActivityPointRow = {
  date: Date;
  count: number | null;
};

type SystemOverviewRecentActivity = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  scope: 'Organizer' | 'System';
  details?: string;
};

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const latestDate = (dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((latest, current) => {
    if (!current) {
      return latest;
    }

    if (!latest || current > latest) {
      return current;
    }

    return latest;
  }, null);

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const formatChartDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);

const formatCurrencyLabel = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

const formatActionLabel = (value: string) =>
  value.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const mapAuditLogToOverviewActivity = (entry: AuditLogEntry): SystemOverviewRecentActivity => {
  const organizerName =
    typeof entry.metadata.organizerName === 'string' ? entry.metadata.organizerName : null;
  const eventName = typeof entry.metadata.eventName === 'string' ? entry.metadata.eventName : null;
  const bookingId =
    typeof entry.metadata.bookingId === 'number' ? `Booking #${entry.metadata.bookingId}` : null;
  const paymentId =
    typeof entry.metadata.paymentId === 'number' ? `Payment #${entry.metadata.paymentId}` : null;
  const status =
    typeof entry.metadata.status === 'string' ? `Status: ${entry.metadata.status.toLowerCase()}` : null;
  const amount =
    typeof entry.metadata.amount === 'number'
      ? `Amount: ${formatCurrencyLabel(entry.metadata.amount)}`
      : null;
  const details = [status, amount].filter(Boolean).join(' • ');

  return {
    id: entry.id,
    timestamp: entry.occurredAt,
    actor: entry.actorLabel || 'system',
    action: formatActionLabel(entry.action),
    target: organizerName || eventName || bookingId || paymentId || '—',
    scope: entry.scope === 'organizer' ? 'Organizer' : 'System',
    details: details || undefined,
  };
};

const buildSynthesizedAuditLogEntries = async (): Promise<AuditLogEntry[]> => {
  const [recentOrganizers, recentBookings, recentPayments] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        organizerId: string;
        organizerName: string;
        ownerEmail: string;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT
        o.id AS "organizerId",
        o.name AS "organizerName",
        u.email AS "ownerEmail",
        o."createdAt",
        o."updatedAt"
      FROM "Organizer" o
      INNER JOIN "User" u ON u.id = o."ownerId"
      ORDER BY o."updatedAt" DESC
      LIMIT 10
    `,
    prisma.$queryRaw<
      Array<{
        bookingId: number;
        organizerId: string | null;
        eventName: string | null;
        email: string | null;
        fullName: string | null;
        createdAt: Date;
        status: string;
      }>
    >`
      SELECT
        b.id AS "bookingId",
        e."organizerId" AS "organizerId",
        e.name AS "eventName",
        b.email AS email,
        b."fullName" AS "fullName",
        b."createdAt",
        b.status::text AS status
      FROM "Booking" b
      LEFT JOIN "Event" e ON e.id = b."eventId"
      ORDER BY b."createdAt" DESC
      LIMIT 10
    `,
    prisma.$queryRaw<
      Array<{
        paymentId: number;
        organizerId: string | null;
        amount: Prisma.Decimal;
        status: string;
        createdAt: Date;
      }>
    >`
      SELECT
        p.id AS "paymentId",
        e."organizerId" AS "organizerId",
        p.amount AS amount,
        p.status::text AS status,
        p."createdAt"
      FROM "Payment" p
      INNER JOIN "Booking" b ON b.id = p."bookingId"
      LEFT JOIN "Event" e ON e.id = b."eventId"
      ORDER BY p."createdAt" DESC
      LIMIT 10
    `,
  ]);

  const entries: AuditLogEntry[] = [
    {
      id: 'system-backup-check',
      scope: 'system',
      organizerId: null,
      action: 'system.backup.health_checked',
      actorLabel: 'system',
      actorType: 'system',
      occurredAt: new Date().toISOString(),
      metadata: {
        status: 'healthy',
      },
    },
    ...recentOrganizers.flatMap((organizer): AuditLogEntry[] => {
      const created: AuditLogEntry = {
        id: `organizer-created-${organizer.organizerId}`,
        scope: 'organizer',
        organizerId: organizer.organizerId,
        action: 'organizer.created',
        actorLabel: organizer.ownerEmail,
        actorType: 'user',
        occurredAt: organizer.createdAt.toISOString(),
        metadata: {
          organizerName: organizer.organizerName,
        },
      };

      const updated: AuditLogEntry[] =
        organizer.updatedAt.getTime() !== organizer.createdAt.getTime()
          ? [
              {
                id: `organizer-updated-${organizer.organizerId}`,
                scope: 'organizer',
                organizerId: organizer.organizerId,
                action: 'organizer.updated',
                actorLabel: organizer.ownerEmail,
                actorType: 'user',
                occurredAt: organizer.updatedAt.toISOString(),
                metadata: {
                  organizerName: organizer.organizerName,
                },
              },
            ]
          : [];

      return [created, ...updated];
    }),
    ...recentBookings.map(
      (booking): AuditLogEntry => ({
        id: `booking-${booking.bookingId}`,
        scope: booking.organizerId ? 'organizer' : 'system',
        organizerId: booking.organizerId,
        action: 'booking.created',
        actorLabel: booking.email || booking.fullName || 'guest',
        actorType: 'user',
        occurredAt: booking.createdAt.toISOString(),
        metadata: {
          bookingId: booking.bookingId,
          eventName: booking.eventName,
          status: booking.status,
        },
      }),
    ),
    ...recentPayments.map(
      (payment): AuditLogEntry => ({
        id: `payment-${payment.paymentId}`,
        scope: payment.organizerId ? 'organizer' : 'system',
        organizerId: payment.organizerId,
        action: 'payment.recorded',
        actorLabel: 'system',
        actorType: 'system',
        occurredAt: payment.createdAt.toISOString(),
        metadata: {
          paymentId: payment.paymentId,
          amount: Number(payment.amount),
          status: payment.status,
        },
      }),
    ),
  ];

  return entries.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 25);
};

export const adminService = {
  listOrganizers: async () => {
    const rows = await prisma.$queryRaw<OrganizerDirectoryRow[]>`
      SELECT
        o.id AS "organizerId",
        o.name AS "organizerName",
        o."ownerId",
        u.email AS "ownerEmail",
        u.name AS "ownerName",
        o."isSuspended",
        o."createdAt",
        COUNT(DISTINCT os."userId")::int AS "staffCount",
        COUNT(DISTINCT e.id)::int AS "eventCount"
      FROM "Organizer" o
      INNER JOIN "User" u ON u.id = o."ownerId"
      LEFT JOIN "OrganizerMembership" os ON os."organizerId" = o.id
      LEFT JOIN "Event" e ON e."organizerId" = o.id
      GROUP BY o.id, u.id
      ORDER BY o."createdAt" DESC
    `;

    return rows.map((row) => {
      return {
        organizerId: row.organizerId,
        organizerName: row.organizerName,
        owner: {
          id: row.ownerId,
          email: row.ownerEmail,
          name: row.ownerName,
        },
        status: row.isSuspended ? 'suspended' : 'active',
        staffCount: row.staffCount ?? 0,
        eventCount: row.eventCount ?? 0,
        createdAt: row.createdAt.toISOString(),
      };
    });
  },

  listAuditLogs: async () => {
    const entries = await buildSynthesizedAuditLogEntries();

    return entries.map(mapAuditLogToOverviewActivity);
  },

  getOrganizerActivity: async (organizerId: string) => {
    const [organizer] = await prisma.$queryRaw<OrganizerActivityBase[]>`
      SELECT
        o.id AS "organizerId",
        o.name AS "organizerName",
        o."ownerId",
        u.email AS "ownerEmail",
        u.name AS "ownerName",
        o."createdAt",
        o."updatedAt",
        o."isSuspended",
        o."suspendedAt"
      FROM "Organizer" o
      INNER JOIN "User" u ON u.id = o."ownerId"
      WHERE o.id = ${organizerId}
      LIMIT 1
    `;

    if (!organizer) {
      throw new HttpError(404, 'Organizer not found');
    }

    const [
      eventCount,
      publishedEventCount,
      staffCount,
      lastEvent,
      bookingMetrics,
      paymentMetrics,
      lastStaffAssignment,
    ] = await Promise.all([
      prisma.event.count({ where: { organizerId } }),
      prisma.event.count({ where: { organizerId, isPublished: true } }),
      prisma.organizerMembership.count({ where: { organizerId } }),
      prisma.event.findFirst({
        where: { organizerId },
        select: { updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.$queryRaw<Array<{ totalBookings: number | null; lastBookingAt: Date | null }>>`
        SELECT
          COUNT(*)::int AS "totalBookings",
          MAX(b."createdAt") AS "lastBookingAt"
        FROM "Booking" b
        INNER JOIN "Event" e ON e.id = b."eventId"
        WHERE e."organizerId" = ${organizerId}
      `,
      prisma.$queryRaw<Array<{ totalRevenue: number | null; lastPaymentAt: Date | null }>>`
        SELECT
          COALESCE(SUM(p.amount), 0)::float AS "totalRevenue",
          MAX(p."createdAt") AS "lastPaymentAt"
        FROM "Payment" p
        INNER JOIN "Booking" b ON b.id = p."bookingId"
        INNER JOIN "Event" e ON e.id = b."eventId"
        WHERE e."organizerId" = ${organizerId}
      `,
      prisma.organizerMembership.findFirst({
        where: { organizerId },
        select: { assignedAt: true },
        orderBy: { assignedAt: 'desc' },
      }),
    ]);

    const bookingSummary = bookingMetrics[0] ?? { totalBookings: 0, lastBookingAt: null };
    const paymentSummary = paymentMetrics[0] ?? { totalRevenue: 0, lastPaymentAt: null };
    const lastActiveAt = latestDate([
      organizer.updatedAt,
      organizer.suspendedAt,
      lastEvent?.updatedAt,
      bookingSummary.lastBookingAt,
      paymentSummary.lastPaymentAt,
      lastStaffAssignment?.assignedAt,
    ]);

    return {
      organizerId: organizer.organizerId,
      organizerName: organizer.organizerName,
      owner: {
        id: organizer.ownerId,
        email: organizer.ownerEmail,
        name: organizer.ownerName,
      },
      status: organizer.isSuspended ? 'suspended' : 'active',
      suspendedAt: organizer.suspendedAt,
      createdAt: organizer.createdAt,
      updatedAt: organizer.updatedAt,
      lastActiveAt,
      summary: {
        totalEvents: eventCount,
        publishedEvents: publishedEventCount,
        staffCount,
        totalBookings: bookingSummary.totalBookings ?? 0,
        totalRevenue: paymentSummary.totalRevenue ?? 0,
      },
      latestActivity: {
        lastEventAt: lastEvent?.updatedAt ?? null,
        lastBookingAt: bookingSummary.lastBookingAt,
        lastPaymentAt: paymentSummary.lastPaymentAt,
        lastStaffAssignmentAt: lastStaffAssignment?.assignedAt ?? null,
      },
    };
  },

  getSystemOverview: async () => {
    const activityWindowStart = addDays(startOfUtcDay(new Date()), -6);

    const [
      users,
      organizers,
      suspendedOrganizers,
      publishedEvents,
      bookings,
      pendingBookings,
      pendingPayments,
      succeededPayments,
      revenueSummary,
      activityRows,
      auditLogEntries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organizer.count(),
      prisma.organizer.count({ where: { isSuspended: true } }),
      prisma.event.count({ where: { isPublished: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'SUCCEEDED' } }),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCEEDED',
        },
      }),
      prisma.$queryRaw<SystemOverviewActivityPointRow[]>`
        WITH activity AS (
          SELECT DATE_TRUNC('day', "createdAt") AS "date"
          FROM "Organizer"
          WHERE "createdAt" >= ${activityWindowStart}

          UNION ALL

          SELECT DATE_TRUNC('day', "createdAt") AS "date"
          FROM "Event"
          WHERE "createdAt" >= ${activityWindowStart}

          UNION ALL

          SELECT DATE_TRUNC('day', "createdAt") AS "date"
          FROM "Booking"
          WHERE "createdAt" >= ${activityWindowStart}

          UNION ALL

          SELECT DATE_TRUNC('day', "createdAt") AS "date"
          FROM "Payment"
          WHERE "createdAt" >= ${activityWindowStart}
        )
        SELECT
          "date",
          COUNT(*)::int AS "count"
        FROM activity
        GROUP BY "date"
        ORDER BY "date" ASC
      `,
      buildSynthesizedAuditLogEntries(),
    ]);

    const activityCountByDate = new Map(
      activityRows.map((row) => [row.date.toISOString().slice(0, 10), row.count ?? 0]),
    );
    const recentActivity = auditLogEntries
      .filter((entry) => entry.id !== 'system-backup-check')
      .slice(0, 6)
      .map(mapAuditLogToOverviewActivity);
    const latestActivity = recentActivity[0] ?? null;

    return {
      metrics: {
        totalOrganizers: organizers,
        activeUsers: users,
        publishedEvents,
        totalBookings: bookings,
        totalRevenue: Number(revenueSummary._sum.amount ?? 0),
      },
      status: {
        suspendedOrganizers,
        pendingBookings,
        pendingPayments,
      },
      highlights: {
        totalRevenueLabel:
          succeededPayments > 0
            ? `${succeededPayments} successful payments`
            : 'No completed payments yet',
        activeUsersLabel: users > 0 ? 'Registered user accounts' : 'No user activity yet',
        latestActivityLabel: latestActivity
          ? `${latestActivity.action} • ${latestActivity.target}`
          : 'No recent activity',
      },
      activitySeries: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(activityWindowStart, index);
        const dateKey = date.toISOString().slice(0, 10);

        return {
          date: formatChartDate(date),
          count: activityCountByDate.get(dateKey) ?? 0,
        };
      }),
      recentActivity,
    };
  },
};
