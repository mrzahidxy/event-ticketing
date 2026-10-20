import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';

import type { DomainEvent } from '../types/domain-event';

const envelope = {
  domainEventId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  tenantId: z.string().uuid(),
};
const entityId = z.number().int().positive().max(2147483647);

export const analyticsDomainEventSchema: z.ZodType<DomainEvent> = z.discriminatedUnion('eventType', [
  z.object({
    ...envelope,
    eventType: z.literal('booking.created'),
    data: z.object({
      bookingId: entityId,
      eventId: z.string().uuid(),
      quantity: entityId,
      totalAmount: z.string().regex(/^(0|[1-9]\d{0,7})\.\d{2}$/),
      currency: z.string().regex(/^[a-zA-Z]{3}$/),
    }),
  }),
  z.object({
    ...envelope,
    eventType: z.literal('checkin.created'),
    data: z.object({
      checkInId: entityId,
      ticketId: z.string().uuid(),
      eventId: z.string().uuid(),
    }),
  }),
]);

export const projectAnalyticsEvent = async (
  db: Pick<PrismaClient, '$transaction'>,
  event: DomainEvent,
): Promise<'processed' | 'duplicate' | 'currency-mismatch'> => {
  return db.$transaction(async (tx) => {
    // The unique key makes concurrent redeliveries idempotent.
    const inserted = await tx.$executeRaw`
      INSERT INTO "ProcessedDomainEvent" ("domainEventId", "eventType")
      VALUES (${event.domainEventId}, ${event.eventType})
      ON CONFLICT ("domainEventId") DO NOTHING
    `;
    if (inserted === 0) return 'duplicate';

    let bookings = 0;
    let tickets = 0;
    let revenue = new Prisma.Decimal(0);
    let checkIns = 0;
    let currency: string | null = null;
    switch (event.eventType) {
      case 'booking.created':
        bookings = 1;
        tickets = event.data.quantity;
        revenue = new Prisma.Decimal(event.data.totalAmount);
        currency = event.data.currency.toLowerCase();
        break;
      case 'checkin.created':
        checkIns = 1;
        break;
    }

    // Keep revenue arithmetic in PostgreSQL and reject mixed currencies.
    const changed = await tx.$executeRaw`
      INSERT INTO "EventAnalytics" (
        "organizerId", "eventId", "totalBookings", "ticketsSold",
        "estimatedRevenue", "currency", "checkIns", "updatedAt"
      ) VALUES (
        ${event.tenantId}::uuid, ${event.data.eventId}::uuid, ${bookings}, ${tickets},
        ${revenue}, ${currency}, ${checkIns}, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("organizerId", "eventId") DO UPDATE SET
        "totalBookings" = "EventAnalytics"."totalBookings" + EXCLUDED."totalBookings",
        "ticketsSold" = "EventAnalytics"."ticketsSold" + EXCLUDED."ticketsSold",
        "estimatedRevenue" = "EventAnalytics"."estimatedRevenue" + EXCLUDED."estimatedRevenue",
        "currency" = COALESCE("EventAnalytics"."currency", EXCLUDED."currency"),
        "checkIns" = "EventAnalytics"."checkIns" + EXCLUDED."checkIns",
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE EXCLUDED."currency" IS NULL OR "EventAnalytics"."currency" IS NULL
        OR "EventAnalytics"."currency" = EXCLUDED."currency"
    `;
    // Keep the idempotency marker so this unsupported currency event is skipped on replay.
    if (changed !== 1) return 'currency-mismatch';
    return 'processed';
  });
};
