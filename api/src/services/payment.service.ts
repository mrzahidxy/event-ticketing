import Stripe from 'stripe';

import { BookingStatus, PaymentStatus, Prisma, Role } from '@prisma/client';

import { CreateCheckoutSessionInput } from '../schemas/payment.schema';
import { AuthenticatedUser } from '../types/user';
import { env } from '../utils/env';
import { HttpError } from '../utils/http-error';
import { prisma } from '../utils/prisma';
import { getStripeClient } from '../utils/stripe';
import { cache } from '../utils/cache';

type PaymentList = Awaited<ReturnType<typeof prisma.payment.findMany>>;

const PAYMENT_CACHE_TTL_SECONDS = 60;

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

const syncCheckoutSession = async (
  session: Stripe.Checkout.Session,
  paymentStatus: PaymentStatus,
  bookingStatus?: BookingStatus
) => {
  const bookingId = Number(session.metadata?.bookingId);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new HttpError(400, 'Stripe webhook payload is missing a valid bookingId');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true },
  });

  if (!booking) {
    throw new HttpError(404, 'Booking not found for webhook event');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { stripeCheckoutSessionId: session.id },
      update: {
        bookingId,
        amount: amountFromCents(session.amount_total),
        currency: session.currency ?? env.STRIPE_CURRENCY,
        status: paymentStatus,
        stripePaymentIntentId: paymentIntentIdFromSession(session),
      },
      create: {
        bookingId,
        amount: amountFromCents(session.amount_total),
        currency: session.currency ?? env.STRIPE_CURRENCY,
        status: paymentStatus,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentIdFromSession(session),
      },
    });

    if (bookingStatus) {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: bookingStatus },
      });
    }
  });

  if (cache.isConnectedToRedis()) {
    await Promise.all([
      cache.del(`booking:${bookingId}`),
      cache.delByPrefix(`bookings:${booking.userId}`),
      cache.delByPrefix(`bookings:all`),
      cache.delByPrefix(`payments:${booking.userId}`),
    ]);
  }
};

export const paymentService = {
  createCheckoutSession: async (input: CreateCheckoutSessionInput, user: AuthenticatedUser) => {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        user: true,
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

    if (!booking.user || booking.totalAmount === null) {
      throw new HttpError(400, 'This booking cannot be paid through the authenticated checkout flow');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new HttpError(400, 'Only pending bookings can be paid');
    }

    const amountInCents = Math.round(Number(booking.totalAmount) * 100);

    if (amountInCents <= 0) {
      throw new HttpError(400, 'Booking total must be greater than zero before checkout');
    }

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: 1,
      price_data: {
        currency: env.STRIPE_CURRENCY,
        product_data: {
          name: `Booking for ${booking.event.name}`,
          description: booking.notes ?? undefined,
        },
        unit_amount: amountInCents,
      },
    };

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.user.email,
      line_items: [lineItem],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        bookingId: booking.id.toString(),
      },
    });

    if (!session.url) {
      throw new HttpError(502, 'Stripe did not return a checkout URL');
    }

    await prisma.payment.upsert({
      where: { stripeCheckoutSessionId: session.id },
      update: {
        amount: booking.totalAmount,
        currency: env.STRIPE_CURRENCY,
        status: PaymentStatus.PENDING,
      },
      create: {
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: env.STRIPE_CURRENCY,
        status: PaymentStatus.PENDING,
        stripeCheckoutSessionId: session.id,
      },
    });

    if (cache.isConnectedToRedis()) {
      await cache.delByPrefix(`payments:${booking.userId}`);
    }

    return {
      id: session.id,
      url: session.url,
      expiresAt: session.expires_at,
    };
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

        if (session.payment_status === 'paid') {
          await syncCheckoutSession(session, PaymentStatus.SUCCEEDED, BookingStatus.CONFIRMED);
        } else {
          await syncCheckoutSession(session, PaymentStatus.PENDING);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncCheckoutSession(session, PaymentStatus.SUCCEEDED, BookingStatus.CONFIRMED);
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncCheckoutSession(session, PaymentStatus.FAILED, BookingStatus.CANCELLED);
        break;
      }
      default:
        break;
    }
  },
};
