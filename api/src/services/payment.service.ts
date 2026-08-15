import { randomUUID } from 'crypto';

import Stripe from 'stripe';

import { BookingStatus, PaymentStatus, Prisma, Role, TicketStatus } from '@prisma/client';

import { bookingService, releaseBookingInventoryReservation } from './booking.service';
import { CreatePublicBookingInput } from '../schemas/booking.schema';
import { CreateCheckoutSessionInput } from '../schemas/payment.schema';
import { AuthenticatedUser } from '../types/user';
import { cache } from '../utils/cache';
import { env } from '../utils/env';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { getStripeClient } from '../utils/stripe';

type PaymentList = Awaited<ReturnType<typeof prisma.payment.findMany>>;

const PAYMENT_CACHE_TTL_SECONDS = 60;
const TICKET_PAYMENT_TYPE = 'ticket_booking';
const ALLOWED_CHECKOUT_REDIRECT_ORIGINS = new Set(
  env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin)
);

const amountFromCents = (amount: number | null | undefined) =>
  new Prisma.Decimal(amount ?? 0).div(100);

const paymentIntentIdFromSession = (session: Stripe.Checkout.Session): string | null => {
  if (!session.payment_intent) {
    return null;
  }

  if (typeof session.payment_intent === 'string') {
    return session.payment_intent;
  }

  return 'id' in session.payment_intent ? session.payment_intent.id : null;
};

const getTicketBookingMetadata = (metadata?: Stripe.Metadata | null) => {
  const paymentType = metadata?.paymentType;
  const bookingId = Number(metadata?.bookingId);

  if (paymentType !== TICKET_PAYMENT_TYPE || !Number.isInteger(bookingId) || bookingId <= 0) {
    return null;
  }

  return {
    bookingId,
    organizerId: metadata?.organizerId ?? null,
    eventId: metadata?.eventId ?? null,
    ticketTierId: metadata?.ticketTierId ?? null,
  };
};

const invalidateBookingPaymentCache = async (bookingId: number, userId: number | null) => {
  if (!cache.isConnectedToRedis()) {
    return;
  }

  const operations: Promise<unknown>[] = [
    cache.del(`booking:${bookingId}`),
    cache.delByPrefix('bookings:all'),
  ];

  if (userId) {
    operations.push(cache.delByPrefix(`bookings:${userId}`));
    operations.push(cache.delByPrefix(`bookings:user-history:${userId}`));
    operations.push(cache.delByPrefix(`payments:${userId}`));
  }

  await Promise.all(operations);
};

const buildTicketCheckoutSessionParams = (
  booking: {
    id: number;
    organizerId: string;
    eventId: string;
    email: string;
    notes: string | null;
    currency: string;
    totalAmount: Prisma.Decimal;
    event: { name: string };
    items: Array<{
      quantity: number;
      ticketTierId: number;
      tierNameSnapshot: string;
      unitPriceSnapshot: Prisma.Decimal;
    }>;
  },
  successUrl: string,
  cancelUrl: string
): Stripe.Checkout.SessionCreateParams => {
  const primaryItem = booking.items[0];

  if (!primaryItem) {
    throw new HttpError(400, 'Booking is missing ticket items');
  }

  const metadata = {
    paymentType: TICKET_PAYMENT_TYPE,
    bookingId: booking.id.toString(),
    organizerId: booking.organizerId,
    eventId: booking.eventId,
    ticketTierId: primaryItem.ticketTierId.toString(),
  };

  return {
    mode: 'payment',
    customer_email: booking.email,
    cancel_url: cancelUrl,
    success_url: successUrl,
    line_items: [
      {
        quantity: primaryItem.quantity,
        price_data: {
          currency: booking.currency,
          product_data: {
            name: `${booking.event.name} - ${primaryItem.tierNameSnapshot}`,
            description: booking.notes ?? undefined,
          },
          unit_amount: Math.round(Number(primaryItem.unitPriceSnapshot) * 100),
        },
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
    },
  };
};

const assertAllowedCheckoutRedirectUrl = (value: string, fieldName: 'successUrl' | 'cancelUrl') => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new HttpError(400, `${fieldName} must be a valid absolute URL`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new HttpError(400, `${fieldName} must use http or https`);
  }

  if (!ALLOWED_CHECKOUT_REDIRECT_ORIGINS.has(url.origin)) {
    throw new HttpError(400, `${fieldName} origin is not allowed`);
  }

  return url;
};

const createStripeWebhookEvent = async (
  tx: Prisma.TransactionClient,
  event: Stripe.Event,
  sessionId?: string | null,
  paymentIntentId?: string | null
) => {
  try {
    await tx.stripeWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        stripeSessionId: sessionId ?? null,
        stripePaymentIntentId: paymentIntentId ?? null,
      },
    });

    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }

    throw error;
  }
};

const finalizeTicketBookingPayment = async (event: Stripe.Event, session: Stripe.Checkout.Session) => {
  const metadata = getTicketBookingMetadata(session.metadata);
  if (!metadata) {
    return;
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  const confirmedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const shouldProcess = await createStripeWebhookEvent(tx, event, session.id, paymentIntentId);
    if (!shouldProcess) {
      return null;
    }

    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${metadata.bookingId} FOR UPDATE`;

    const booking = await tx.booking.findUnique({
      where: { id: metadata.bookingId },
      include: {
        items: {
          orderBy: { id: 'asc' },
        },
        tickets: true,
        payments: {
          where: { stripeCheckoutSessionId: session.id },
        },
      },
    });

    if (!booking) {
      throw new HttpError(404, 'Booking not found for ticket-payment webhook');
    }

    const expectedTicketCount = booking.items.reduce((sum, item) => sum + item.quantity, 0);
    const existingPayment = booking.payments[0];

    if (
      booking.status === BookingStatus.CONFIRMED &&
      existingPayment?.status === PaymentStatus.SUCCEEDED &&
      booking.tickets.length === expectedTicketCount
    ) {
      await tx.payment.update({
        where: { stripeCheckoutSessionId: session.id },
        data: {
          amount: amountFromCents(session.amount_total),
          currency: session.currency ?? booking.currency,
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: paymentIntentId,
          webhookConfirmedAt: existingPayment.webhookConfirmedAt ?? confirmedAt,
        },
      });

      return {
        bookingId: booking.id,
        userId: booking.userId,
      };
    }

    if (!existingPayment) {
      throw new HttpError(404, 'Payment record not found for ticket-payment webhook');
    }

    const ticketRows = booking.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        bookingId: booking.id,
        eventId: booking.eventId,
        ticketTierId: item.ticketTierId,
        code: `TKT-${booking.id}-${randomUUID().slice(0, 8).toUpperCase()}`,
        qrPayload: randomUUID(),
        attendeeName: booking.fullName,
        attendeeEmail: booking.email,
        status: TicketStatus.ISSUED,
      }))
    );

    if (ticketRows.length > 0) {
      await tx.ticket.createMany({
        data: ticketRows,
      });
    }

    await tx.payment.update({
      where: { stripeCheckoutSessionId: session.id },
      data: {
        amount: amountFromCents(session.amount_total),
        currency: session.currency ?? booking.currency,
        status: PaymentStatus.SUCCEEDED,
        stripePaymentIntentId: paymentIntentId,
        webhookConfirmedAt: confirmedAt,
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: booking.confirmedAt ?? confirmedAt,
        cancelledAt: null,
      },
    });

    return {
      bookingId: booking.id,
      userId: booking.userId,
    };
  });

  if (result) {
    await invalidateBookingPaymentCache(result.bookingId, result.userId);
  }
};

const markTicketBookingOutcome = async (
  event: Stripe.Event,
  reference:
    | { session: Stripe.Checkout.Session; paymentStatus: PaymentStatus }
    | { paymentIntent: Stripe.PaymentIntent; paymentStatus: PaymentStatus },
  bookingStatus: BookingStatus
) => {
  const metadata = getTicketBookingMetadata(
    'session' in reference ? reference.session.metadata : reference.paymentIntent.metadata
  );

  if (!metadata) {
    return;
  }

  const stripeSessionId = 'session' in reference ? reference.session.id : null;
  const stripePaymentIntentId =
    'session' in reference
      ? paymentIntentIdFromSession(reference.session)
      : reference.paymentIntent.id;

  const result = await prisma.$transaction(async (tx) => {
    const shouldProcess = await createStripeWebhookEvent(
      tx,
      event,
      stripeSessionId,
      stripePaymentIntentId
    );

    if (!shouldProcess) {
      return null;
    }

    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${metadata.bookingId} FOR UPDATE`;

    const booking = await tx.booking.findUnique({
      where: { id: metadata.bookingId },
      include: {
        payments: {
          where: stripeSessionId
            ? { stripeCheckoutSessionId: stripeSessionId }
            : { stripePaymentIntentId: stripePaymentIntentId ?? undefined },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new HttpError(404, 'Booking not found for ticket-payment webhook');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return {
        bookingId: booking.id,
        userId: booking.userId,
      };
    }

    const payment = booking.payments[0] ?? await tx.payment.findFirst({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'desc' },
    });

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          amount:
            'session' in reference
              ? amountFromCents(reference.session.amount_total)
              : payment.amount,
          currency:
            'session' in reference
              ? reference.session.currency ?? booking.currency
              : payment.currency,
          status: reference.paymentStatus,
          stripePaymentIntentId: stripePaymentIntentId ?? payment.stripePaymentIntentId,
        },
      });
    }

    const releasedInventory = bookingStatus === BookingStatus.CANCELLED
      ? await releaseBookingInventoryReservation(tx, booking.id)
      : false;

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: bookingStatus,
        cancelledAt: booking.cancelledAt ?? (releasedInventory ? new Date() : booking.cancelledAt),
      },
    });

    return {
      bookingId: booking.id,
      userId: booking.userId,
    };
  });

  if (result) {
    await invalidateBookingPaymentCache(result.bookingId, result.userId);
  }
};

const createCheckoutSessionForBooking = async (
  bookingId: number,
  successUrl: string,
  cancelUrl: string,
  user: AuthenticatedUser
) => {
  const validatedSuccessUrl = assertAllowedCheckoutRedirectUrl(successUrl, 'successUrl');
  const validatedCancelUrl = assertAllowedCheckoutRedirectUrl(cancelUrl, 'cancelUrl');

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      items: {
        orderBy: { id: 'asc' },
      },
      event: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!booking) {
    throw new HttpError(404, 'Booking not found for payment');
  }

  if (user.role !== Role.ADMIN && booking.userId !== user.id) {
    throw new HttpError(403, 'You are not allowed to pay for this booking');
  }

  if (!booking.userId) {
    throw new HttpError(400, 'This booking is not attached to a user account');
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new HttpError(400, 'Only pending bookings can be paid');
  }

  if (booking.totalAmount.lte(0)) {
    throw new HttpError(400, 'Booking total must be greater than zero before checkout');
  }

  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create(
    buildTicketCheckoutSessionParams(booking, validatedSuccessUrl.toString(), validatedCancelUrl.toString())
  );

  if (!session.url) {
    throw new HttpError(502, 'Stripe did not return a checkout URL');
  }

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: PaymentStatus.PENDING,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentIdFromSession(session),
    },
  });

  await invalidateBookingPaymentCache(booking.id, booking.userId);

  return {
    booking,
    checkoutSession: {
      id: session.id,
      url: session.url,
      expiresAt: session.expires_at,
    },
  };
};

export const paymentService = {
  createPublicTicketCheckoutSession: async (
    organizerId: string,
    input: CreatePublicBookingInput,
    user?: AuthenticatedUser | null
  ) => {
    const successUrl = assertAllowedCheckoutRedirectUrl(input.successUrl, 'successUrl');
    const cancelUrl = assertAllowedCheckoutRedirectUrl(input.cancelUrl, 'cancelUrl');
    const bookingSubmission = await bookingService.createPublicTicketBooking(input, user, organizerId);
    let sessionId: string | null = null;

    try {
      successUrl.searchParams.set('bookingId', bookingSubmission.id.toString());
      successUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');

      cancelUrl.searchParams.set('bookingId', bookingSubmission.id.toString());

      const { booking, checkoutSession } = await createCheckoutSessionForBooking(
        bookingSubmission.id,
        successUrl.toString(),
        cancelUrl.toString(),
        user!
      );

      sessionId = checkoutSession.id;

      return {
        booking,
        checkoutSession,
      };
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        const releasedInventory = await releaseBookingInventoryReservation(tx, bookingSubmission.id);

        await tx.booking.update({
          where: { id: bookingSubmission.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: releasedInventory ? new Date() : undefined,
          },
        });
      });

      if (sessionId) {
        await prisma.payment.updateMany({
          where: { stripeCheckoutSessionId: sessionId },
          data: {
            status: PaymentStatus.FAILED,
          },
        });
      }

      throw error;
    }
  },

  createCheckoutSession: async (input: CreateCheckoutSessionInput, user: AuthenticatedUser) => {
    const { checkoutSession } = await createCheckoutSessionForBooking(
      input.bookingId,
      input.successUrl,
      input.cancelUrl,
      user
    );

    return checkoutSession;
  },

  listByUser: async (userId: number) => {
    const cacheKey = `payments:${userId}`;

    if (cache.isConnectedToRedis()) {
      const cached = await cache.get<PaymentList>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (cache.isConnectedToRedis()) {
      await cache.set(cacheKey, payments, PAYMENT_CACHE_TTL_SECONDS);
    }

    return payments;
  },

  handleWebhook: async (signature: string | undefined, rawBody: Buffer) => {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new HttpError(503, 'Stripe webhooks are not configured');
    }

    if (!signature) {
      throw new HttpError(400, 'Missing Stripe signature');
    }

    const stripe = getStripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new HttpError(400, 'Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!getTicketBookingMetadata(session.metadata)) {
          return;
        }

        if (session.payment_status === 'paid') {
          await finalizeTicketBookingPayment(event, session);
        }

        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!getTicketBookingMetadata(session.metadata)) {
          return;
        }

        await finalizeTicketBookingPayment(event, session);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!getTicketBookingMetadata(session.metadata)) {
          return;
        }

        await markTicketBookingOutcome(
          event,
          { session, paymentStatus: PaymentStatus.FAILED },
          BookingStatus.CANCELLED
        );
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!getTicketBookingMetadata(session.metadata)) {
          return;
        }

        await markTicketBookingOutcome(
          event,
          { session, paymentStatus: PaymentStatus.EXPIRED },
          BookingStatus.CANCELLED
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (!getTicketBookingMetadata(paymentIntent.metadata)) {
          return;
        }

        await markTicketBookingOutcome(
          event,
          { paymentIntent, paymentStatus: PaymentStatus.FAILED },
          BookingStatus.CANCELLED
        );
        break;
      }
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (!getTicketBookingMetadata(paymentIntent.metadata)) {
          return;
        }

        await markTicketBookingOutcome(
          event,
          { paymentIntent, paymentStatus: PaymentStatus.CANCELLED },
          BookingStatus.CANCELLED
        );
        break;
      }
      default:
        break;
    }
  },
};
