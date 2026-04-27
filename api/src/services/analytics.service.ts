import { BookingStatus, PaymentStatus, Prisma, Role } from '@prisma/client';

import type { AnalyticsQueryInput } from '../schemas/analytics.schema';
import type { AuthenticatedUser } from '../types/user';
import { HttpError } from '../utils/http-error';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { resolveOrganizerTenantScope } from './tenant-scope.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_TOP_LIMIT = 5;
const MAX_TOP_LIMIT = 20;
const DEFAULT_LOOKBACK_DAYS = 30;
const ANALYTICS_CACHE_TTL_SECONDS = 60 * 5;

// Performance notes:
// Consider indexes on Booking(createdAt, status, eventId), Payment(createdAt, status, bookingId),
// Event(organizerId, createdAt, isPublished), and OrganizerStaff(organizerId, userId) if analytics grows.

type AnalyticsGranularity = 'day' | 'week' | 'month';

type ResolvedAnalyticsQuery = {
  organizerId?: string;
  dateFrom: Date;
  dateTo: Date;
  granularity: AnalyticsGranularity;
  page: number;
  limit: number;
  topLimit: number;
};

type AnalyticsScope = {
  visibility: 'platform' | 'organizer';
  organizerIds: string[];
  cacheScope: string;
};

type AnalyticsDateRange = {
  dateFrom: string;
  dateTo: string;
  granularity: AnalyticsGranularity;
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

type BookingStatusMetric = {
  status: BookingStatus;
  count: number;
  revenue: number;
};

type PaymentStatusMetric = {
  status: PaymentStatus;
  count: number;
  revenue: number;
};

type RoleMetric = {
  role: Role;
  count: number;
};

type TrendPoint = {
  period: string;
  primaryValue: number;
  secondaryValue?: number;
};

type TopEventMetric = {
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  bookingCount: number;
  revenue: number;
};

type OrganizerEventMetric = {
  organizerId: string;
  organizerName: string;
  totalEvents: number;
  publishedEvents: number;
  unpublishedEvents: number;
  averagePrice: number;
};

type StaffPerformanceMetric = {
  userId: number;
  email: string;
  name: string | null;
  assignedOrganizerCount: number;
  latestAssignmentAt: string | null;
  bookingCount: number;
  revenue: number;
};

type BookingSummary = {
  totalBookings: number;
  totalRevenue: number;
  averageOrderValue: number;
  bookingsByStatus: BookingStatusMetric[];
};

type PaymentSummary = {
  totalPayments: number;
  totalRevenue: number;
  averageTransactionValue: number;
  successRate: number;
  failureRate: number;
  revenueByStatus: PaymentStatusMetric[];
};

type EventSummary = {
  totalEvents: number;
  publishedEvents: number;
  unpublishedEvents: number;
  averageEventPrice: number;
};

type UserSummary = {
  totalScopedUsers: number;
  registrationsInRange: number;
  activeUsersByRole: RoleMetric[];
};

type AnalyticsOverview = {
  scope: Pick<AnalyticsScope, 'visibility' | 'organizerIds'>;
  dateRange: AnalyticsDateRange;
  bookingSummary: BookingSummary;
  paymentSummary: PaymentSummary;
  eventSummary: EventSummary;
  userSummary: UserSummary;
  topEvents: TopEventMetric[];
};

type BookingAnalytics = {
  scope: Pick<AnalyticsScope, 'visibility' | 'organizerIds'>;
  dateRange: AnalyticsDateRange;
  summary: BookingSummary;
  trends: TrendPoint[];
  topEvents: PaginatedResponse<TopEventMetric>;
};

type PaymentAnalytics = {
  scope: Pick<AnalyticsScope, 'visibility' | 'organizerIds'>;
  dateRange: AnalyticsDateRange;
  summary: PaymentSummary;
  trends: TrendPoint[];
};

type EventAnalytics = {
  scope: Pick<AnalyticsScope, 'visibility' | 'organizerIds'>;
  dateRange: AnalyticsDateRange;
  summary: EventSummary;
  eventsByOrganizer: OrganizerEventMetric[];
  popularEvents: PaginatedResponse<TopEventMetric>;
};

type UserAnalytics = {
  scope: Pick<AnalyticsScope, 'visibility' | 'organizerIds'>;
  dateRange: AnalyticsDateRange;
  summary: UserSummary;
  registrationTrends: TrendPoint[];
  staffPerformance: PaginatedResponse<StaffPerformanceMetric>;
};

type BookingSummaryRow = {
  totalBookings: number | null;
  pendingBookings: number | null;
  confirmedBookings: number | null;
  cancelledBookings: number | null;
  completedBookings: number | null;
  confirmedRevenue: number | null;
  completedRevenue: number | null;
  totalRevenue: number | null;
  averageOrderValue: number | null;
};

type BookingTrendRow = {
  period: Date;
  bookingCount: number | null;
  revenue: number | null;
};

type TopEventRow = {
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  bookingCount: number | null;
  revenue: number | null;
};

type CountRow = {
  totalItems: number | null;
};

type PaymentSummaryRow = {
  totalPayments: number | null;
  pendingPayments: number | null;
  succeededPayments: number | null;
  failedPayments: number | null;
  pendingRevenue: number | null;
  succeededRevenue: number | null;
  failedRevenue: number | null;
  averageTransactionValue: number | null;
};

type PaymentTrendRow = {
  period: Date;
  paymentCount: number | null;
  revenue: number | null;
};

type EventSummaryRow = {
  totalEvents: number | null;
  publishedEvents: number | null;
  unpublishedEvents: number | null;
  averageEventPrice: number | null;
};

type OrganizerEventRow = {
  organizerId: string;
  organizerName: string;
  totalEvents: number | null;
  publishedEvents: number | null;
  unpublishedEvents: number | null;
  averagePrice: number | null;
};

type UserSummaryRow = {
  totalScopedUsers: number | null;
  registrationsInRange: number | null;
};

type RoleMetricRow = {
  role: Role;
  count: number | null;
};

type RegistrationTrendRow = {
  period: Date;
  registrationCount: number | null;
};

type StaffPerformanceRow = {
  userId: number;
  email: string;
  name: string | null;
  assignedOrganizerCount: number | null;
  latestAssignmentAt: Date | null;
  bookingCount: number | null;
  revenue: number | null;
};

export type AnalyticsServiceDependencies = {
  prisma: typeof prisma;
  cache: typeof cache;
  logger: typeof logger;
};

const normalizePagination = (page?: number, limit?: number) => {
  const safePage = Number.isFinite(page) && (page ?? 0) > 0 ? Math.floor(page as number) : DEFAULT_PAGE;
  const requestedLimit =
    Number.isFinite(limit) && (limit ?? 0) > 0 ? Math.floor(limit as number) : DEFAULT_LIMIT;
  const safeLimit = Math.min(requestedLimit, MAX_LIMIT);

  return { page: safePage, limit: safeLimit };
};

const startOfUtcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const endOfUtcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 23, 59, 59, 999));

const subtractDays = (value: Date, days: number) => new Date(value.getTime() - days * 24 * 60 * 60 * 1000);

const roundMetric = (value: number | null | undefined) =>
  Math.round(((value ?? 0) + Number.EPSILON) * 100) / 100;

const periodToIso = (value: Date) => value.toISOString();

const paginatedMeta = (page: number, limit: number, totalItems: number) => ({
  page,
  limit,
  totalItems,
  totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
});

const coerceDateInput = (value: unknown, fieldName: 'dateFrom' | 'dateTo'): Date | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new HttpError(400, `${fieldName} must be a valid date`);
    }

    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new HttpError(400, `${fieldName} must be a valid date`);
    }

    return parsed;
  }

  throw new HttpError(400, `${fieldName} must be a valid date`);
};

const normalizeAnalyticsQuery = (input: AnalyticsQueryInput): ResolvedAnalyticsQuery => {
  const { page, limit } = normalizePagination(input.page, input.limit);
  const topLimit = Math.min(input.topLimit ?? DEFAULT_TOP_LIMIT, MAX_TOP_LIMIT);
  const parsedDateTo = coerceDateInput(input.dateTo, 'dateTo');
  const parsedDateFrom = coerceDateInput(input.dateFrom, 'dateFrom');
  const dateTo = parsedDateTo ? endOfUtcDay(parsedDateTo) : new Date();
  const dateFrom = parsedDateFrom
    ? startOfUtcDay(parsedDateFrom)
    : startOfUtcDay(subtractDays(dateTo, DEFAULT_LOOKBACK_DAYS));

  return {
    organizerId: input.organizerId,
    dateFrom,
    dateTo,
    granularity: input.granularity ?? 'day',
    page,
    limit,
    topLimit,
  };
};

const dateRangePayload = (query: ResolvedAnalyticsQuery): AnalyticsDateRange => ({
  dateFrom: query.dateFrom.toISOString(),
  dateTo: query.dateTo.toISOString(),
  granularity: query.granularity,
});

const formatScopePayload = (scope: AnalyticsScope) => ({
  visibility: scope.visibility,
  organizerIds: scope.organizerIds,
});

const buildCacheKey = (
  segment: string,
  scope: AnalyticsScope,
  query: ResolvedAnalyticsQuery,
  extra?: string
) =>
  [
    'analytics',
    segment,
    scope.cacheScope,
    query.dateFrom.toISOString(),
    query.dateTo.toISOString(),
    query.granularity,
    `page:${query.page}`,
    `limit:${query.limit}`,
    `top:${query.topLimit}`,
    extra ?? '',
  ]
    .filter(Boolean)
    .join(':');

const organizerIdsAsUuidList = (organizerIds: string[]) =>
  Prisma.join(organizerIds.map((id) => Prisma.sql`CAST(${id} AS UUID)`));

const organizerFilterFragment = (organizerIds: string[]) =>
  organizerIds.length
    ? Prisma.sql`AND e."organizerId" IN (${organizerIdsAsUuidList(organizerIds)})`
    : Prisma.sql``;

const organizerWhereFragment = (organizerIds: string[]) =>
  organizerIds.length
    ? Prisma.sql`WHERE o.id IN (${organizerIdsAsUuidList(organizerIds)})`
    : Prisma.sql``;

const organizerStaffWhereFragment = (organizerIds: string[]) =>
  organizerIds.length
    ? Prisma.sql`WHERE os."organizerId" IN (${organizerIdsAsUuidList(organizerIds)})`
    : Prisma.sql``;

const emptyBookingSummary = (): BookingSummary => ({
  totalBookings: 0,
  totalRevenue: 0,
  averageOrderValue: 0,
  bookingsByStatus: [
    { status: BookingStatus.PENDING, count: 0, revenue: 0 },
    { status: BookingStatus.CONFIRMED, count: 0, revenue: 0 },
    { status: BookingStatus.CANCELLED, count: 0, revenue: 0 },
  ],
});

const emptyPaymentSummary = (): PaymentSummary => ({
  totalPayments: 0,
  totalRevenue: 0,
  averageTransactionValue: 0,
  successRate: 0,
  failureRate: 0,
  revenueByStatus: [
    { status: PaymentStatus.PENDING, count: 0, revenue: 0 },
    { status: PaymentStatus.SUCCEEDED, count: 0, revenue: 0 },
    { status: PaymentStatus.FAILED, count: 0, revenue: 0 },
  ],
});

const emptyEventSummary = (): EventSummary => ({
  totalEvents: 0,
  publishedEvents: 0,
  unpublishedEvents: 0,
  averageEventPrice: 0,
});

const emptyUserSummary = (): UserSummary => ({
  totalScopedUsers: 0,
  registrationsInRange: 0,
  activeUsersByRole: mergeRoleMetrics([]),
});

const emptyRoleMetrics = (): RoleMetric[] => [
  { role: Role.ADMIN, count: 0 },
  { role: Role.OWNER, count: 0 },
  { role: Role.STAFF, count: 0 },
  { role: Role.USER, count: 0 },
];

const mergeRoleMetrics = (rows: RoleMetricRow[]): RoleMetric[] => {
  const metrics = new Map<Role, number>();
  for (const item of emptyRoleMetrics()) {
    metrics.set(item.role, item.count);
  }

  for (const row of rows) {
    metrics.set(row.role, row.count ?? 0);
  }

  return Array.from(metrics.entries()).map(([role, count]) => ({ role, count }));
};

const withCache = async <T>(
  deps: AnalyticsServiceDependencies,
  cacheKey: string,
  resolver: () => Promise<T>
): Promise<T> => {
  if (deps.cache.isConnectedToRedis()) {
    try {
      const cached = await deps.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      deps.logger.warn?.({ err: error, cacheKey }, 'Analytics cache read failed; continuing without cache');
    }
  }

  const value = await resolver();

  if (deps.cache.isConnectedToRedis()) {
    try {
      await deps.cache.set(cacheKey, value, ANALYTICS_CACHE_TTL_SECONDS);
    } catch (error) {
      deps.logger.warn?.({ err: error, cacheKey }, 'Analytics cache write failed; returning uncached result');
    }
  }

  return value;
};

const resolveAnalyticsScope = async (
  deps: AnalyticsServiceDependencies,
  actor: AuthenticatedUser,
  requestedOrganizerId?: string
): Promise<AnalyticsScope> => {
  return resolveOrganizerTenantScope(deps, actor, {
    requestedOrganizerId,
    allowAdminPlatform: true,
    ownerNoOrganizerMessage: 'Owner analytics require an owned organizer',
    staffNoAssignmentsMessage: 'Staff analytics require at least one organizer assignment',
    forbiddenMessage: 'You do not have permission to access analytics for this organizer',
  });
};

const createAnalyticsServiceHelpers = (deps: AnalyticsServiceDependencies) => {
  const getBookingSummary = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<BookingSummary> => {
    const organizerFilter = organizerFilterFragment(scope.organizerIds);

    const rows = await deps.prisma.$queryRaw<BookingSummaryRow[]>`
      SELECT
        COUNT(*)::int AS "totalBookings",
        COUNT(*) FILTER (WHERE b.status = 'PENDING')::int AS "pendingBookings",
        COUNT(*) FILTER (WHERE b.status = 'CONFIRMED')::int AS "confirmedBookings",
        COUNT(*) FILTER (WHERE b.status = 'CANCELLED')::int AS "cancelledBookings",
        0::int AS "completedBookings",
        COALESCE(
          SUM(CASE WHEN b.status = 'CONFIRMED' THEN b."totalAmount" ELSE 0 END),
          0
        )::double precision AS "confirmedRevenue",
        0::double precision AS "completedRevenue",
        COALESCE(
          SUM(CASE WHEN b.status = 'CONFIRMED' THEN b."totalAmount" ELSE 0 END),
          0
        )::double precision AS "totalRevenue",
        COALESCE(
          AVG(CASE WHEN b.status = 'CONFIRMED' THEN NULLIF(b."totalAmount", 0) END),
          0
        )::double precision AS "averageOrderValue"
      FROM "Booking" b
      INNER JOIN "Event" e ON e.id = b."eventId"
      WHERE b."createdAt" >= ${query.dateFrom}
        AND b."createdAt" <= ${query.dateTo}
        ${organizerFilter}
    `;

    const row = rows[0];
    if (!row) {
      return emptyBookingSummary();
    }

    return {
      totalBookings: row.totalBookings ?? 0,
      totalRevenue: roundMetric(row.totalRevenue),
      averageOrderValue: roundMetric(row.averageOrderValue),
      bookingsByStatus: [
        {
          status: BookingStatus.PENDING,
          count: row.pendingBookings ?? 0,
          revenue: 0,
        },
        {
          status: BookingStatus.CONFIRMED,
          count: row.confirmedBookings ?? 0,
          revenue: roundMetric(row.confirmedRevenue),
        },
        {
          status: BookingStatus.CANCELLED,
          count: row.cancelledBookings ?? 0,
          revenue: 0,
        },
      ],
    };
  };

  const getBookingTrends = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<TrendPoint[]> => {
    const organizerFilter = organizerFilterFragment(scope.organizerIds);

    const rows = await deps.prisma.$queryRaw<BookingTrendRow[]>`
      SELECT
        DATE_TRUNC(${query.granularity}, b."createdAt") AS period,
        COUNT(*)::int AS "bookingCount",
        COALESCE(
          SUM(CASE WHEN b.status = 'CONFIRMED' THEN b."totalAmount" ELSE 0 END),
          0
        )::double precision AS revenue
      FROM "Booking" b
      INNER JOIN "Event" e ON e.id = b."eventId"
      WHERE b."createdAt" >= ${query.dateFrom}
        AND b."createdAt" <= ${query.dateTo}
        ${organizerFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((row) => ({
      period: periodToIso(row.period),
      primaryValue: row.bookingCount ?? 0,
      secondaryValue: roundMetric(row.revenue),
    }));
  };

  const getTopEvents = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<TopEventMetric>> => {
    const organizerFilter = organizerFilterFragment(scope.organizerIds);
    const offset = (page - 1) * limit;

    const [countRows, dataRows] = await Promise.all([
      deps.prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(*)::int AS "totalItems"
        FROM (
          SELECT e.id
          FROM "Event" e
          INNER JOIN "Booking" b ON b."eventId" = e.id
          WHERE b."createdAt" >= ${query.dateFrom}
            AND b."createdAt" <= ${query.dateTo}
            ${organizerFilter}
          GROUP BY e.id
        ) ranked
      `,
      deps.prisma.$queryRaw<TopEventRow[]>`
        SELECT
          e.id AS "eventId",
          e.name AS "eventName",
          o.id AS "organizerId",
          o.name AS "organizerName",
          COUNT(b.id)::int AS "bookingCount",
          COALESCE(
            SUM(CASE WHEN b.status = 'CONFIRMED' THEN b."totalAmount" ELSE 0 END),
            0
          )::double precision AS revenue
        FROM "Event" e
        INNER JOIN "Organizer" o ON o.id = e."organizerId"
        INNER JOIN "Booking" b ON b."eventId" = e.id
        WHERE b."createdAt" >= ${query.dateFrom}
          AND b."createdAt" <= ${query.dateTo}
          ${organizerFilter}
        GROUP BY e.id, e.name, o.id, o.name
        ORDER BY COUNT(b.id) DESC, revenue DESC, e.name ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    ]);

    const totalItems = countRows[0]?.totalItems ?? 0;
    const data = dataRows.map((row) => ({
      eventId: row.eventId,
      eventName: row.eventName,
      organizerId: row.organizerId,
      organizerName: row.organizerName,
      bookingCount: row.bookingCount ?? 0,
      revenue: roundMetric(row.revenue),
    }));

    return {
      data,
      meta: paginatedMeta(page, limit, totalItems),
    };
  };

  const getPaymentSummary = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<PaymentSummary> => {
    const organizerFilter = organizerFilterFragment(scope.organizerIds);

    const rows = await deps.prisma.$queryRaw<PaymentSummaryRow[]>`
      SELECT
        COUNT(*)::int AS "totalPayments",
        COUNT(*) FILTER (WHERE p.status = 'PENDING')::int AS "pendingPayments",
        COUNT(*) FILTER (WHERE p.status = 'SUCCEEDED')::int AS "succeededPayments",
        COUNT(*) FILTER (WHERE p.status = 'FAILED')::int AS "failedPayments",
        COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0)::double precision AS "pendingRevenue",
        COALESCE(SUM(CASE WHEN p.status = 'SUCCEEDED' THEN p.amount ELSE 0 END), 0)::double precision AS "succeededRevenue",
        COALESCE(SUM(CASE WHEN p.status = 'FAILED' THEN p.amount ELSE 0 END), 0)::double precision AS "failedRevenue",
        COALESCE(AVG(CASE WHEN p.status = 'SUCCEEDED' THEN p.amount END), 0)::double precision AS "averageTransactionValue"
      FROM "Payment" p
      INNER JOIN "Booking" b ON b.id = p."bookingId"
      INNER JOIN "Event" e ON e.id = b."eventId"
      WHERE p."createdAt" >= ${query.dateFrom}
        AND p."createdAt" <= ${query.dateTo}
        ${organizerFilter}
    `;

    const row = rows[0];
    if (!row) {
      return emptyPaymentSummary();
    }

    const succeededPayments = row.succeededPayments ?? 0;
    const failedPayments = row.failedPayments ?? 0;
    const settledPayments = succeededPayments + failedPayments;

    return {
      totalPayments: row.totalPayments ?? 0,
      totalRevenue: roundMetric(row.succeededRevenue),
      averageTransactionValue: roundMetric(row.averageTransactionValue),
      successRate: settledPayments === 0 ? 0 : roundMetric((succeededPayments / settledPayments) * 100),
      failureRate: settledPayments === 0 ? 0 : roundMetric((failedPayments / settledPayments) * 100),
      revenueByStatus: [
        {
          status: PaymentStatus.PENDING,
          count: row.pendingPayments ?? 0,
          revenue: roundMetric(row.pendingRevenue),
        },
        {
          status: PaymentStatus.SUCCEEDED,
          count: succeededPayments,
          revenue: roundMetric(row.succeededRevenue),
        },
        {
          status: PaymentStatus.FAILED,
          count: failedPayments,
          revenue: roundMetric(row.failedRevenue),
        },
      ],
    };
  };

  const getPaymentTrends = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<TrendPoint[]> => {
    const organizerFilter = organizerFilterFragment(scope.organizerIds);

    const rows = await deps.prisma.$queryRaw<PaymentTrendRow[]>`
      SELECT
        DATE_TRUNC(${query.granularity}, p."createdAt") AS period,
        COUNT(*)::int AS "paymentCount",
        COALESCE(
          SUM(CASE WHEN p.status = 'SUCCEEDED' THEN p.amount ELSE 0 END),
          0
        )::double precision AS revenue
      FROM "Payment" p
      INNER JOIN "Booking" b ON b.id = p."bookingId"
      INNER JOIN "Event" e ON e.id = b."eventId"
      WHERE p."createdAt" >= ${query.dateFrom}
        AND p."createdAt" <= ${query.dateTo}
        ${organizerFilter}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((row) => ({
      period: periodToIso(row.period),
      primaryValue: roundMetric(row.revenue),
      secondaryValue: row.paymentCount ?? 0,
    }));
  };

  const getEventSummary = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<EventSummary> => {
    const organizerFilter = organizerFilterFragment(scope.organizerIds);

    const rows = await deps.prisma.$queryRaw<EventSummaryRow[]>`
      SELECT
        COUNT(*)::int AS "totalEvents",
        COUNT(*) FILTER (WHERE e."isPublished" = true)::int AS "publishedEvents",
        COUNT(*) FILTER (WHERE e."isPublished" = false)::int AS "unpublishedEvents",
        COALESCE(AVG(tp."averagePrice"), 0)::double precision AS "averageEventPrice"
      FROM "Event" e
      LEFT JOIN LATERAL (
        SELECT AVG(tt.price)::double precision AS "averagePrice"
        FROM "TicketTier" tt
        WHERE tt."eventId" = e.id
      ) tp ON true
      WHERE e."createdAt" >= ${query.dateFrom}
        AND e."createdAt" <= ${query.dateTo}
        ${organizerFilter}
    `;

    const row = rows[0];
    if (!row) {
      return emptyEventSummary();
    }

    return {
      totalEvents: row.totalEvents ?? 0,
      publishedEvents: row.publishedEvents ?? 0,
      unpublishedEvents: row.unpublishedEvents ?? 0,
      averageEventPrice: roundMetric(row.averageEventPrice),
    };
  };

  const getEventsByOrganizer = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<OrganizerEventMetric[]> => {
    const organizerFilter = organizerWhereFragment(scope.organizerIds);

    const rows = await deps.prisma.$queryRaw<OrganizerEventRow[]>`
      SELECT
        o.id AS "organizerId",
        o.name AS "organizerName",
        COUNT(e.id)::int AS "totalEvents",
        COUNT(*) FILTER (WHERE e."isPublished" = true)::int AS "publishedEvents",
        COUNT(*) FILTER (WHERE e."isPublished" = false)::int AS "unpublishedEvents",
        COALESCE(AVG(tp."averagePrice"), 0)::double precision AS "averagePrice"
      FROM "Organizer" o
      LEFT JOIN "Event" e
        ON e."organizerId" = o.id
       AND e."createdAt" >= ${query.dateFrom}
       AND e."createdAt" <= ${query.dateTo}
      LEFT JOIN LATERAL (
        SELECT AVG(tt.price)::double precision AS "averagePrice"
        FROM "TicketTier" tt
        WHERE tt."eventId" = e.id
      ) tp ON true
      ${organizerFilter}
      GROUP BY o.id, o.name
      ORDER BY COUNT(e.id) DESC, o.name ASC
    `;

    return rows.map((row) => ({
      organizerId: row.organizerId,
      organizerName: row.organizerName,
      totalEvents: row.totalEvents ?? 0,
      publishedEvents: row.publishedEvents ?? 0,
      unpublishedEvents: row.unpublishedEvents ?? 0,
      averagePrice: roundMetric(row.averagePrice),
    }));
  };

  const scopedUsersCte = (scope: AnalyticsScope) => {
    if (!scope.organizerIds.length) {
      return Prisma.sql`
        WITH "ScopedUsers" AS (
          SELECT u.id, u.email, u.name, u.role, u."createdAt"
          FROM "User" u
        )
      `;
    }

    const organizerIds = organizerIdsAsUuidList(scope.organizerIds);

    return Prisma.sql`
      WITH "ScopedUsers" AS (
        SELECT DISTINCT
          u.id,
          u.email,
          u.name,
          u.role,
          u."createdAt"
        FROM "User" u
        LEFT JOIN "Booking" b ON b."userId" = u.id
        LEFT JOIN "Event" e ON e.id = b."eventId"
        LEFT JOIN "Organizer" o ON o."ownerId" = u.id
        LEFT JOIN "OrganizerMembership" os ON os."userId" = u.id
        WHERE
          e."organizerId" IN (${organizerIds})
          OR o.id IN (${organizerIds})
          OR os."organizerId" IN (${organizerIds})
      )
    `;
  };

  const getUserSummary = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<UserSummary> => {
    const organizerIds = organizerIdsAsUuidList(scope.organizerIds);

    const [summaryRows, roleRows] = await Promise.all([
      deps.prisma.$queryRaw<UserSummaryRow[]>`
        ${scopedUsersCte(scope)}
        SELECT
          COUNT(*)::int AS "totalScopedUsers",
          COUNT(*) FILTER (
            WHERE "createdAt" >= ${query.dateFrom}
              AND "createdAt" <= ${query.dateTo}
          )::int AS "registrationsInRange"
        FROM "ScopedUsers"
      `,
      scope.organizerIds.length
        ? deps.prisma.$queryRaw<RoleMetricRow[]>`
            WITH "ActiveUserIds" AS (
              SELECT DISTINCT b."userId" AS id
              FROM "Booking" b
              INNER JOIN "Event" e ON e.id = b."eventId"
              WHERE e."organizerId" IN (${organizerIds})
                AND b."createdAt" >= ${query.dateFrom}
                AND b."createdAt" <= ${query.dateTo}
              UNION
              SELECT DISTINCT o."ownerId" AS id
              FROM "Organizer" o
              WHERE o.id IN (${organizerIds})
              UNION
              SELECT DISTINCT os."userId" AS id
              FROM "OrganizerMembership" os
              WHERE os."organizerId" IN (${organizerIds})
            )
            SELECT u.role, COUNT(*)::int AS count
            FROM "User" u
            INNER JOIN "ActiveUserIds" a ON a.id = u.id
            GROUP BY u.role
            ORDER BY u.role ASC
          `
        : deps.prisma.$queryRaw<RoleMetricRow[]>`
            WITH "ActiveUserIds" AS (
              SELECT DISTINCT b."userId" AS id
              FROM "Booking" b
              WHERE b."createdAt" >= ${query.dateFrom}
                AND b."createdAt" <= ${query.dateTo}
              UNION
              SELECT DISTINCT o."ownerId" AS id
              FROM "Organizer" o
              UNION
              SELECT DISTINCT os."userId" AS id
              FROM "OrganizerMembership" os
            )
            SELECT u.role, COUNT(*)::int AS count
            FROM "User" u
            INNER JOIN "ActiveUserIds" a ON a.id = u.id
            GROUP BY u.role
            ORDER BY u.role ASC
          `,
    ]);

    const summary = summaryRows[0];

    return {
      totalScopedUsers: summary?.totalScopedUsers ?? 0,
      registrationsInRange: summary?.registrationsInRange ?? 0,
      activeUsersByRole: mergeRoleMetrics(roleRows),
    };
  };

  const getRegistrationTrends = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<TrendPoint[]> => {
    const rows = await deps.prisma.$queryRaw<RegistrationTrendRow[]>`
      ${scopedUsersCte(scope)}
      SELECT
        DATE_TRUNC(${query.granularity}, "createdAt") AS period,
        COUNT(*)::int AS "registrationCount"
      FROM "ScopedUsers"
      WHERE "createdAt" >= ${query.dateFrom}
        AND "createdAt" <= ${query.dateTo}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    return rows.map((row) => ({
      period: periodToIso(row.period),
      primaryValue: row.registrationCount ?? 0,
    }));
  };

  const getStaffPerformance = async (
    scope: AnalyticsScope,
    query: ResolvedAnalyticsQuery
  ): Promise<PaginatedResponse<StaffPerformanceMetric>> => {
    const organizerFilter = organizerStaffWhereFragment(scope.organizerIds);
    const offset = (query.page - 1) * query.limit;

    const [countRows, rows] = await Promise.all([
      deps.prisma.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT os."userId")::int AS "totalItems"
        FROM "OrganizerMembership" os
        ${organizerFilter}
      `,
      deps.prisma.$queryRaw<StaffPerformanceRow[]>`
        SELECT
          u.id AS "userId",
          u.email,
          u.name,
          COUNT(DISTINCT os."organizerId")::int AS "assignedOrganizerCount",
          MAX(os."assignedAt") AS "latestAssignmentAt",
          COUNT(DISTINCT b.id)::int AS "bookingCount",
          COALESCE(
            SUM(CASE WHEN b.status = 'CONFIRMED' THEN b."totalAmount" ELSE 0 END),
            0
          )::double precision AS revenue
        FROM "OrganizerMembership" os
        INNER JOIN "User" u ON u.id = os."userId"
        LEFT JOIN "Event" e ON e."organizerId" = os."organizerId"
        LEFT JOIN "Booking" b
          ON b."eventId" = e.id
         AND b."createdAt" >= ${query.dateFrom}
         AND b."createdAt" <= ${query.dateTo}
        ${organizerFilter}
        GROUP BY u.id, u.email, u.name
        ORDER BY COUNT(DISTINCT os."organizerId") DESC, COUNT(DISTINCT b.id) DESC, revenue DESC, u.email ASC
        LIMIT ${query.limit}
        OFFSET ${offset}
      `,
    ]);

    const totalItems = countRows[0]?.totalItems ?? 0;

    return {
      data: rows.map((row) => ({
        userId: row.userId,
        email: row.email,
        name: row.name,
        assignedOrganizerCount: row.assignedOrganizerCount ?? 0,
        latestAssignmentAt: row.latestAssignmentAt ? row.latestAssignmentAt.toISOString() : null,
        bookingCount: row.bookingCount ?? 0,
        revenue: roundMetric(row.revenue),
      })),
      meta: paginatedMeta(query.page, query.limit, totalItems),
    };
  };

  return {
    getBookingSummary,
    getBookingTrends,
    getTopEvents,
    getPaymentSummary,
    getPaymentTrends,
    getEventSummary,
    getEventsByOrganizer,
    getUserSummary,
    getRegistrationTrends,
    getStaffPerformance,
  };
};

export const createAnalyticsService = (deps: AnalyticsServiceDependencies) => {
  const helpers = createAnalyticsServiceHelpers(deps);

  return {
    getOverview: async (
      actor: AuthenticatedUser,
      input: AnalyticsQueryInput
    ): Promise<AnalyticsOverview> => {
      const query = normalizeAnalyticsQuery(input);

      try {
        const scope = await resolveAnalyticsScope(deps, actor, query.organizerId);
        const cacheKey = buildCacheKey('overview', scope, query);

        return withCache(deps, cacheKey, async () => {
          const safeResolve = async <T>(
            label: string,
            fallback: T,
            resolver: () => Promise<T>
          ): Promise<T> => {
            try {
              return await resolver();
            } catch (error) {
              deps.logger.error(
                { err: error, actorId: actor.id, input, label },
                `Failed to build analytics overview segment: ${label}`
              );
              return fallback;
            }
          };

          const [bookingSummary, paymentSummary, eventSummary, userSummary, topEvents] =
            await Promise.all([
              safeResolve('bookingSummary', emptyBookingSummary(), () =>
                helpers.getBookingSummary(scope, query)
              ),
              safeResolve('paymentSummary', emptyPaymentSummary(), () =>
                helpers.getPaymentSummary(scope, query)
              ),
              safeResolve('eventSummary', emptyEventSummary(), () =>
                helpers.getEventSummary(scope, query)
              ),
              safeResolve('userSummary', emptyUserSummary(), () =>
                helpers.getUserSummary(scope, query)
              ),
              safeResolve('topEvents', { data: [], meta: paginatedMeta(1, query.topLimit, 0) }, () =>
                helpers.getTopEvents(scope, query, 1, query.topLimit)
              ),
            ]);

          return {
            scope: formatScopePayload(scope),
            dateRange: dateRangePayload(query),
            bookingSummary,
            paymentSummary,
            eventSummary,
            userSummary,
            topEvents: topEvents.data,
          };
        });
      } catch (error) {
        deps.logger.error({ err: error, actorId: actor.id, input }, 'Failed to build analytics overview');
        throw error;
      }
    },

    getBookingAnalytics: async (
      actor: AuthenticatedUser,
      input: AnalyticsQueryInput
    ): Promise<BookingAnalytics> => {
      const query = normalizeAnalyticsQuery(input);

      try {
        const scope = await resolveAnalyticsScope(deps, actor, query.organizerId);
        const cacheKey = buildCacheKey('bookings', scope, query);

        return withCache(deps, cacheKey, async () => {
          const [summary, trends, topEvents] = await Promise.all([
            helpers.getBookingSummary(scope, query),
            helpers.getBookingTrends(scope, query),
            helpers.getTopEvents(scope, query, query.page, query.limit),
          ]);

          return {
            scope: formatScopePayload(scope),
            dateRange: dateRangePayload(query),
            summary,
            trends,
            topEvents,
          };
        });
      } catch (error) {
        deps.logger.error({ err: error, actorId: actor.id, input }, 'Failed to build booking analytics');
        throw error;
      }
    },

    getPaymentAnalytics: async (
      actor: AuthenticatedUser,
      input: AnalyticsQueryInput
    ): Promise<PaymentAnalytics> => {
      const query = normalizeAnalyticsQuery(input);

      try {
        const scope = await resolveAnalyticsScope(deps, actor, query.organizerId);
        const cacheKey = buildCacheKey('payments', scope, query);

        return withCache(deps, cacheKey, async () => {
          const [summary, trends] = await Promise.all([
            helpers.getPaymentSummary(scope, query),
            helpers.getPaymentTrends(scope, query),
          ]);

          return {
            scope: formatScopePayload(scope),
            dateRange: dateRangePayload(query),
            summary,
            trends,
          };
        });
      } catch (error) {
        deps.logger.error({ err: error, actorId: actor.id, input }, 'Failed to build payment analytics');
        throw error;
      }
    },

    getEventAnalytics: async (
      actor: AuthenticatedUser,
      input: AnalyticsQueryInput
    ): Promise<EventAnalytics> => {
      const query = normalizeAnalyticsQuery(input);

      try {
        const scope = await resolveAnalyticsScope(deps, actor, query.organizerId);
        const cacheKey = buildCacheKey('events', scope, query);

        return withCache(deps, cacheKey, async () => {
          const [summary, eventsByOrganizer, popularEvents] = await Promise.all([
            helpers.getEventSummary(scope, query),
            helpers.getEventsByOrganizer(scope, query),
            helpers.getTopEvents(scope, query, query.page, query.limit),
          ]);

          return {
            scope: formatScopePayload(scope),
            dateRange: dateRangePayload(query),
            summary,
            eventsByOrganizer,
            popularEvents,
          };
        });
      } catch (error) {
        deps.logger.error({ err: error, actorId: actor.id, input }, 'Failed to build event analytics');
        throw error;
      }
    },

    getUserAnalytics: async (
      actor: AuthenticatedUser,
      input: AnalyticsQueryInput
    ): Promise<UserAnalytics> => {
      const query = normalizeAnalyticsQuery(input);

      try {
        const scope = await resolveAnalyticsScope(deps, actor, query.organizerId);
        const cacheKey = buildCacheKey('users', scope, query);

        return withCache(deps, cacheKey, async () => {
          const [summary, registrationTrends, staffPerformance] = await Promise.all([
            helpers.getUserSummary(scope, query),
            helpers.getRegistrationTrends(scope, query),
            helpers.getStaffPerformance(scope, query),
          ]);

          return {
            scope: formatScopePayload(scope),
            dateRange: dateRangePayload(query),
            summary,
            registrationTrends,
            staffPerformance,
          };
        });
      } catch (error) {
        deps.logger.error({ err: error, actorId: actor.id, input }, 'Failed to build user analytics');
        throw error;
      }
    },
  };
};

export const analyticsService = createAnalyticsService({
  prisma,
  cache,
  logger,
});
