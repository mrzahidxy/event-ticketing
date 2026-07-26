import {
  CheckinSource,
  BookingStatus,
  OrganizerRole,
  PaymentStatus,
  PrismaClient,
  Role,
  Prisma,
  TicketStatus,
} from '@prisma/client';

import { resolvePermissions } from '../src/config/rbac';
import { seedEnv } from '../src/config/seed';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  password: string;
};

const usersToSeed: SeedUser[] = [
  {
    email: seedEnv.SEED_ADMIN_EMAIL,
    name: 'Platform Admin',
    role: Role.ADMIN,
    password: seedEnv.SEED_ADMIN_PASSWORD,
  },
  {
    email: seedEnv.SEED_OWNER_EMAIL,
    name: 'Organizer Owner',
    role: Role.OWNER,
    password: seedEnv.SEED_OWNER_PASSWORD,
  },
  {
    email: seedEnv.SEED_STAFF_EMAIL,
    name: 'Organizer Staff',
    role: Role.STAFF,
    password: seedEnv.SEED_STAFF_PASSWORD,
  },
  {
    email: seedEnv.SEED_USER_EMAIL,
    name: 'Ticket Buyer One',
    role: Role.USER,
    password: seedEnv.SEED_USER_PASSWORD,
  },
  {
    email: 'owner2@example.com',
    name: 'Second Organizer Owner',
    role: Role.OWNER,
    password: seedEnv.SEED_OWNER_PASSWORD,
  },
  {
    email: 'staff2@example.com',
    name: 'Second Organizer Staff',
    role: Role.STAFF,
    password: seedEnv.SEED_STAFF_PASSWORD,
  },
  {
    email: 'user2@example.com',
    name: 'Ticket Buyer Two',
    role: Role.USER,
    password: seedEnv.SEED_USER_PASSWORD,
  },
];

async function resetSeedData(): Promise<void> {
  await prisma.$transaction([
    prisma.ticketCheckin.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.bookingItem.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.ticketTier.deleteMany(),
    prisma.event.deleteMany(),
    prisma.organizerMembership.deleteMany(),
    prisma.organizer.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createUser(userData: SeedUser) {
  const passwordHash = await hashPassword(userData.password);

  return prisma.user.create({
    data: {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      permissions: resolvePermissions(userData.role),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
}

async function main(): Promise<void> {
  await resetSeedData();

  const usersByEmail = new Map<string, Awaited<ReturnType<typeof createUser>>>();

  for (const userData of usersToSeed) {
    const user = await createUser(userData);
    usersByEmail.set(user.email, user);
  }

  const owner = usersByEmail.get(seedEnv.SEED_OWNER_EMAIL);
  const staff = usersByEmail.get(seedEnv.SEED_STAFF_EMAIL);
  const buyer = usersByEmail.get(seedEnv.SEED_USER_EMAIL);
  const owner2 = usersByEmail.get('owner2@example.com');
  const staff2 = usersByEmail.get('staff2@example.com');
  const buyer2 = usersByEmail.get('user2@example.com');

  if (!owner || !staff || !buyer || !owner2 || !staff2 || !buyer2) {
    throw new Error('Seed dependency resolution failed for owners, staff, or users');
  }

  const organizer = await prisma.organizer.create({
    data: {
      name: 'Northwind Live',
      ownerId: owner.id,
      isSuspended: false,
      suspendedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const organizer2 = await prisma.organizer.create({
    data: {
      name: 'Southridge Events',
      ownerId: owner2.id,
      isSuspended: false,
      suspendedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  await prisma.organizerMembership.createMany({
    data: [
      {
        organizerId: organizer.id,
        userId: staff.id,
        role: OrganizerRole.STAFF,
      },
      {
        organizerId: organizer2.id,
        userId: staff2.id,
        role: OrganizerRole.STAFF,
      },
    ],
  });

  const publishedEvent = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: 'Founders Summit 2026',
      description: 'Public event for listing, booking, and checkout flows.',
      isPublished: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const unpublishedEvent = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: 'Owner Strategy Sprint',
      description: 'Unpublished organizer-only planning event.',
      isPublished: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const secondPublishedEvent = await prisma.event.create({
    data: {
      organizerId: organizer2.id,
      name: 'Southridge Expo 2026',
      description: 'Second organizer published event for cross-tenant testing.',
      isPublished: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const secondUnpublishedEvent = await prisma.event.create({
    data: {
      organizerId: organizer2.id,
      name: 'Southridge Private Preview',
      description: 'Second organizer unpublished event for owner/admin tests.',
      isPublished: false,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const now = new Date();
  const salesStartedAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const salesEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiredSalesEndAt = new Date(now.getTime() - 60 * 60 * 1000);
  const futureSalesStartAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const publishedEventTier = await prisma.ticketTier.create({
    data: {
      eventId: publishedEvent.id,
      name: 'General Admission',
      description: 'Standard entry pass for public booking flows',
      price: new Prisma.Decimal('199.00'),
      currency: 'usd',
      quantityTotal: 500,
      quantitySold: 4,
      salesStartAt: salesStartedAt,
      salesEndAt: salesEndsAt,
      isActive: true,
    },
    select: {
      id: true,
      price: true,
      currency: true,
    },
  });

  const secondEventTier = await prisma.ticketTier.create({
    data: {
      eventId: secondPublishedEvent.id,
      name: 'Expo General Admission',
      description: 'Second organizer standard public-bookable tier',
      price: new Prisma.Decimal('79.00'),
      currency: 'usd',
      quantityTotal: 100,
      quantitySold: 1,
      salesStartAt: salesStartedAt,
      salesEndAt: salesEndsAt,
      isActive: true,
    },
    select: {
      id: true,
      price: true,
      currency: true,
    },
  });

  await prisma.ticketTier.createMany({
    data: [
      {
        eventId: publishedEvent.id,
        name: 'VIP Admission',
        description: 'Premium public-bookable tier with unlimited inventory',
        price: new Prisma.Decimal('349.00'),
        currency: 'usd',
        quantityTotal: null,
        quantitySold: 0,
        salesStartAt: salesStartedAt,
        salesEndAt: salesEndsAt,
        isActive: true,
      },
      {
        eventId: publishedEvent.id,
        name: 'Sold Out Early Bird',
        description: 'Sold-out tier used to verify public filtering and booking validation',
        price: new Prisma.Decimal('99.00'),
        currency: 'usd',
        quantityTotal: 25,
        quantitySold: 25,
        salesStartAt: salesStartedAt,
        salesEndAt: salesEndsAt,
        isActive: true,
      },
      {
        eventId: publishedEvent.id,
        name: 'Future Release',
        description: 'Future sales window tier used to verify booking validation',
        price: new Prisma.Decimal('249.00'),
        currency: 'usd',
        quantityTotal: 100,
        quantitySold: 0,
        salesStartAt: futureSalesStartAt,
        salesEndAt: null,
        isActive: true,
      },
      {
        eventId: publishedEvent.id,
        name: 'Expired Promo',
        description: 'Expired tier used to verify booking validation',
        price: new Prisma.Decimal('149.00'),
        currency: 'usd',
        quantityTotal: 100,
        quantitySold: 0,
        salesStartAt: null,
        salesEndAt: expiredSalesEndAt,
        isActive: true,
      },
      {
        eventId: publishedEvent.id,
        name: 'Inactive Holdback',
        description: 'Inactive tier used to verify booking validation',
        price: new Prisma.Decimal('129.00'),
        currency: 'usd',
        quantityTotal: 50,
        quantitySold: 0,
        salesStartAt: null,
        salesEndAt: null,
        isActive: false,
      },
      {
        eventId: unpublishedEvent.id,
        name: 'Internal Planning Seat',
        description: 'Tier attached to an unpublished event for owner/admin testing',
        price: new Prisma.Decimal('0.00'),
        currency: 'usd',
        quantityTotal: 20,
        quantitySold: 0,
        salesStartAt: null,
        salesEndAt: null,
        isActive: true,
      },
      {
        eventId: secondPublishedEvent.id,
        name: 'Expo VIP Unlimited',
        description: 'Second organizer unlimited public-bookable tier',
        price: new Prisma.Decimal('159.00'),
        currency: 'usd',
        quantityTotal: null,
        quantitySold: 0,
        salesStartAt: salesStartedAt,
        salesEndAt: salesEndsAt,
        isActive: true,
      },
      {
        eventId: secondPublishedEvent.id,
        name: 'Expo Sold Out',
        description: 'Second organizer sold-out tier for inventory tests',
        price: new Prisma.Decimal('49.00'),
        currency: 'usd',
        quantityTotal: 10,
        quantitySold: 10,
        salesStartAt: salesStartedAt,
        salesEndAt: salesEndsAt,
        isActive: true,
      },
      {
        eventId: secondUnpublishedEvent.id,
        name: 'Preview Internal Seat',
        description: 'Second organizer unpublished-event tier',
        price: new Prisma.Decimal('0.00'),
        currency: 'usd',
        quantityTotal: 15,
        quantitySold: 0,
        salesStartAt: null,
        salesEndAt: null,
        isActive: true,
      },
    ],
  });

  const ticketCodeBase = `NWL-2026-${publishedEvent.id.slice(0, 8)}`;
  const confirmedTicketIssueAt = new Date('2026-06-21T20:05:00.000Z');

  const pendingQuantity = 1;
  const pendingAmount = publishedEventTier.price.mul(pendingQuantity);

  const pendingBooking = await prisma.booking.create({
    data: {
      userId: buyer.id,
      organizerId: organizer.id,
      eventId: publishedEvent.id,
      fullName: buyer.name ?? 'Ticket Buyer',
      email: buyer.email,
      phone: '+1 555 111 2222',
      subtotalAmount: pendingAmount,
      totalAmount: pendingAmount,
      currency: publishedEventTier.currency,
      status: BookingStatus.PENDING,
      notes: 'Pending booking for Stripe checkout testing',
      items: {
        create: {
          ticketTierId: publishedEventTier.id,
          tierNameSnapshot: 'General Admission',
          unitPriceSnapshot: publishedEventTier.price,
          quantity: pendingQuantity,
          lineTotal: pendingAmount,
        },
      },
    },
    select: {
      id: true,
      totalAmount: true,
    },
  });

  const confirmedQuantity = 2;
  const confirmedAmount = publishedEventTier.price.mul(confirmedQuantity);

  const confirmedBooking = await prisma.booking.create({
    data: {
      userId: buyer.id,
      organizerId: organizer.id,
      eventId: publishedEvent.id,
      fullName: 'Guest Buyer',
      email: 'guest.buyer@example.com',
      phone: '+1 555 333 4444',
      subtotalAmount: confirmedAmount,
      totalAmount: confirmedAmount,
      currency: publishedEventTier.currency,
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date('2026-06-21T20:00:00.000Z'),
      notes: 'Confirmed booking for support lookup flow',
      items: {
        create: {
          ticketTierId: publishedEventTier.id,
          tierNameSnapshot: 'General Admission',
          unitPriceSnapshot: publishedEventTier.price,
          quantity: confirmedQuantity,
          lineTotal: confirmedAmount,
        },
      },
    },
    select: {
      id: true,
      totalAmount: true,
    },
  });

  const secondPendingQuantity = 1;
  const secondPendingAmount = secondEventTier.price.mul(secondPendingQuantity);

  const secondPendingBooking = await prisma.booking.create({
    data: {
      userId: buyer2.id,
      organizerId: organizer2.id,
      eventId: secondPublishedEvent.id,
      fullName: buyer2.name ?? 'Ticket Buyer Two',
      email: buyer2.email,
      phone: '+1 555 777 8888',
      subtotalAmount: secondPendingAmount,
      totalAmount: secondPendingAmount,
      currency: secondEventTier.currency,
      status: BookingStatus.PENDING,
      notes: 'Second organizer pending booking for tenant-scope testing',
      items: {
        create: {
          ticketTierId: secondEventTier.id,
          tierNameSnapshot: 'Expo General Admission',
          unitPriceSnapshot: secondEventTier.price,
          quantity: secondPendingQuantity,
          lineTotal: secondPendingAmount,
        },
      },
    },
    select: {
      id: true,
      totalAmount: true,
    },
  });

  const cancelledBooking = await prisma.booking.create({
    data: {
      userId: buyer.id,
      organizerId: organizer.id,
      eventId: publishedEvent.id,
      fullName: 'Cancelled Buyer',
      email: 'cancelled.buyer@example.com',
      phone: '+1 555 999 0000',
      subtotalAmount: publishedEventTier.price,
      totalAmount: publishedEventTier.price,
      currency: publishedEventTier.currency,
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2026-06-22T18:00:00.000Z'),
      notes: 'Cancelled booking for status filter testing',
      items: {
        create: {
          ticketTierId: publishedEventTier.id,
          tierNameSnapshot: 'General Admission',
          unitPriceSnapshot: publishedEventTier.price,
          quantity: 1,
          lineTotal: publishedEventTier.price,
        },
      },
    },
    select: {
      id: true,
      totalAmount: true,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: pendingBooking.id,
      amount: pendingBooking.totalAmount,
      currency: publishedEventTier.currency,
      status: PaymentStatus.PENDING,
      stripeCheckoutSessionId: 'seed_session_pending_booking',
      stripePaymentIntentId: null,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: confirmedBooking.id,
      amount: confirmedBooking.totalAmount,
      currency: publishedEventTier.currency,
      status: PaymentStatus.SUCCEEDED,
      stripeCheckoutSessionId: 'seed_session_confirmed_booking',
      stripePaymentIntentId: 'seed_pi_confirmed_booking',
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: secondPendingBooking.id,
      amount: secondPendingBooking.totalAmount,
      currency: secondEventTier.currency,
      status: PaymentStatus.PENDING,
      stripeCheckoutSessionId: 'seed_session_second_org_pending',
      stripePaymentIntentId: null,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: cancelledBooking.id,
      amount: cancelledBooking.totalAmount,
      currency: publishedEventTier.currency,
      status: PaymentStatus.FAILED,
      stripeCheckoutSessionId: 'seed_session_cancelled_booking',
      stripePaymentIntentId: 'seed_pi_cancelled_booking',
    },
  });

  const confirmedTickets = await Promise.all(
    Array.from({ length: confirmedQuantity }, async (_, index) =>
      prisma.ticket.create({
        data: {
          bookingId: confirmedBooking.id,
          eventId: publishedEvent.id,
          ticketTierId: publishedEventTier.id,
          code: `${ticketCodeBase}-${index + 1}`,
          qrPayload: `${ticketCodeBase}:QR:${index + 1}`,
          attendeeName: index === 0 ? 'Guest Buyer' : 'Guest Buyer 2',
          attendeeEmail: index === 0 ? 'guest.buyer@example.com' : 'guest.buyer+2@example.com',
          status: index === 0 ? TicketStatus.CHECKED_IN : TicketStatus.ISSUED,
          issuedAt: confirmedTicketIssueAt,
          checkedInAt: index === 0 ? confirmedTicketIssueAt : null,
          voidedAt: null,
        },
        select: {
          id: true,
          code: true,
          status: true,
        },
      })
    ),
  );

  await prisma.ticketCheckin.create({
    data: {
      ticketId: confirmedTickets[0].id,
      checkedInByUserId: staff.id,
      checkedInAt: confirmedTicketIssueAt,
      scanSource: CheckinSource.MANUAL,
      notes: 'Seeded check-in for support flow',
    },
  });

  console.info('Database has been seeded with lean ticketing data');
  console.info(`Users: ${usersToSeed.length} (admin, 2 owners, 2 staff, 2 public users)`);
  console.info('Organizers: 2 (Northwind Live, Southridge Events)');
  console.info('Events: 4 (2 published, 2 unpublished)');
  console.info('Ticket tiers: 11 (4 public-bookable, sold-out/future/expired/inactive/unpublished fixtures)');
  console.info('Bookings: 4 (2 pending, 1 confirmed, 1 cancelled)');
  console.info('Payments: 4 (2 pending, 1 succeeded, 1 failed)');
  console.info('Tickets: 2 (1 checked in, 1 issued)');
  console.info('Ticket check-ins: 1 (manual)');
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
