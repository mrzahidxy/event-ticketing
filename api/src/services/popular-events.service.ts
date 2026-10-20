import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../utils/prisma';
import { env } from '../utils/env';
import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

const POPULAR_EVENTS_LIMIT = 5;
const CANDIDATE_LIMIT = 500;
const RECOMMENDATION_TIMEOUT_MS = 1500;

const rankedEventsSchema = z.object({
  items: z.array(
    z.object({
      eventId: z.string().uuid(),
      rank: z.number().int().positive(),
      reasonCode: z.literal('POPULAR_BY_TICKET_SALES'),
    }).strict(),
  ).max(POPULAR_EVENTS_LIMIT),
}).strict();

const createCandidateSelect = (now: Date) => ({
  id: true,
  organizerId: true,
  name: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  organizer: { select: { id: true, name: true } },
  ticketTiers: {
    where: {
      isActive: true,
      AND: [
        { OR: [{ salesStartAt: null }, { salesStartAt: { lte: now } }] },
        { OR: [{ salesEndAt: null }, { salesEndAt: { gte: now } }] },
      ],
    },
    orderBy: { id: 'asc' as const },
    select: {
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
    },
  },
} satisfies Prisma.EventSelect);

type Candidate = Prisma.EventGetPayload<{ select: ReturnType<typeof createCandidateSelect> }>;

const recommendationUrl = `${env.RECOMMENDATION_SERVICE_URL.replace(/\/$/, '')}/recommendations/popular-events`;

const requestRanking = async (
  candidates: Candidate[],
  salesByEvent: Map<string, number>,
) => {
  let response: Response;

  try {
    response = await fetch(recommendationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(RECOMMENDATION_TIMEOUT_MS),
      body: JSON.stringify({
        limit: POPULAR_EVENTS_LIMIT,
        events: candidates.map((event) => ({
          eventId: event.id,
          startsAt: event.startsAt?.toISOString() ?? null,
          ticketsSold: salesByEvent.get(`${event.organizerId}:${event.id}`) ?? 0,
        })),
      }),
    });
  } catch (error) {
    logger.warn({ err: error }, 'Popular event recommendation service is unavailable');
    throw new HttpError(503, 'Popular events are temporarily unavailable');
  }

  if (!response.ok) {
    logger.warn({ status: response.status }, 'Popular event recommendation service returned an error');
    throw new HttpError(response.status >= 500 ? 503 : 502, 'Popular events are temporarily unavailable');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    logger.warn({ err: error }, 'Popular event recommendation service returned invalid JSON');
    throw new HttpError(502, 'Popular events are temporarily unavailable');
  }

  const parsed = rankedEventsSchema.safeParse(payload);
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.issues }, 'Popular event recommendation response failed validation');
    throw new HttpError(502, 'Popular events are temporarily unavailable');
  }

  const candidateIds = new Set(candidates.map((event) => event.id));
  const returnedIds = new Set<string>();
  for (const [index, item] of parsed.data.items.entries()) {
    if (!candidateIds.has(item.eventId) || returnedIds.has(item.eventId) || item.rank !== index + 1) {
      logger.warn({ eventId: item.eventId }, 'Popular event recommendation returned an unknown or duplicate event');
      throw new HttpError(502, 'Popular events are temporarily unavailable');
    }
    returnedIds.add(item.eventId);
  }

  return parsed.data.items;
};

export const popularEventsService = {
  listPopular: async () => {
    const now = new Date();
    const candidates = await prisma.event.findMany({
      where: {
        isPublished: true,
        OR: [
          { startsAt: { lte: now }, endsAt: { gt: now } },
          { startsAt: null, endsAt: null },
        ],
        organizer: { isSuspended: false },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: CANDIDATE_LIMIT,
      select: createCandidateSelect(now),
    });

    if (candidates.length === 0) return [];

    const analytics = await prisma.eventAnalytics.findMany({
      where: {
        OR: candidates.map(({ organizerId, id }) => ({ organizerId, eventId: id })),
      },
      select: { organizerId: true, eventId: true, ticketsSold: true },
    });
    const salesByEvent = new Map(
      analytics.map((row) => [`${row.organizerId}:${row.eventId}`, row.ticketsSold]),
    );

    const eventsWithSales = candidates.filter(
      (event) => (salesByEvent.get(`${event.organizerId}:${event.id}`) ?? 0) > 0,
    );
    if (eventsWithSales.length === 0) return [];

    const ranked = await requestRanking(eventsWithSales, salesByEvent);
    const eventsById = new Map(candidates.map((event) => [event.id, event]));

    return ranked.map(({ eventId, rank }) => {
      const { organizer, ticketTiers, ...event } = eventsById.get(eventId)!;
      return {
        rank,
        reason: 'Popular with ticket buyers',
        organizer,
        event: {
          ...event,
          ticketTiers: ticketTiers.map(({ quantitySold, ...tier }) => ({
            ...tier,
            price: tier.price.toNumber(),
            soldOut: tier.quantityTotal !== null && quantitySold >= tier.quantityTotal,
          })),
        },
      };
    });
  },
};
