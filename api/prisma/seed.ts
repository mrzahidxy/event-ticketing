import 'dotenv/config';

import {
  BookingStatus,
  OrganizerRole,
  PaymentStatus,
  PrismaClient,
  Role,
  Prisma,
} from '@prisma/client';

import { resolvePermissions } from '../src/config/rbac';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  password: string;
};

const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || 'owner@example.com';
const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'changeMeOwner1!';

const usersToSeed: SeedUser[] = [
  {
    email: 'admin@example.com',
    name: 'Platform Admin',
    role: Role.ADMIN,
    password: 'changeMeAdmin1!',
  },
  {
    email: ownerEmail,
    name: 'Organizer Owner',
    role: Role.OWNER,
    password: ownerPassword,
  },
  {
    email: 'staff@example.com',
    name: 'Organizer Staff',
    role: Role.STAFF,
    password: 'changeMeStaff1!',
  },
  {
    email: 'user@example.com',
    name: 'Ticket Buyer',
    role: Role.USER,
    password: 'changeMeUser1!',
  },
];

async function resetSeedData(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "TicketCheckin",
      "Ticket",
      "Payment",
      "BookingItem",
      "Booking",
      "TicketTier",
      "Event",
      "OrganizerMembership",
      "Organizer",
      "User"
    RESTART IDENTITY CASCADE
  `);
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

  const owner = usersByEmail.get(ownerEmail);
  const staff = usersByEmail.get('staff@example.com');
  const buyer = usersByEmail.get('user@example.com');

  if (!owner || !staff || !buyer) {
    throw new Error('Seed dependency resolution failed for owner, staff, or user');
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

  await prisma.organizerMembership.create({
    data: {
      organizerId: organizer.id,
      userId: staff.id,
      role: OrganizerRole.STAFF,
    },
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

  await prisma.event.create({
    data: {
      organizerId: organizer.id,
      name: 'Owner Strategy Sprint',
      description: 'Unpublished organizer-only planning event.',
      isPublished: false,
    },
  });

  const publishedEventTier = await prisma.ticketTier.create({
    data: {
      eventId: publishedEvent.id,
      name: 'General Admission',
      description: 'Standard entry pass',
      price: new Prisma.Decimal('199.00'),
      currency: 'usd',
      quantityTotal: 500,
      quantitySold: 3,
      isActive: true,
    },
    select: {
      id: true,
      price: true,
      currency: true,
    },
  });

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

  console.info('Database has been seeded with lean ticketing data');
  console.info(`Users: ${usersToSeed.length} (admin, owner, staff, user)`);
  console.info('Organizer: Northwind Live');
  console.info('Events: 2 (1 published, 1 unpublished)');
  console.info('Ticket tiers: 1 (General Admission)');
  console.info('Bookings: 2 (1 pending, 1 confirmed)');
  console.info('Payments: 2 (1 pending, 1 succeeded)');
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
