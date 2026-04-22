# Lean Event Ticketing API

Express + Prisma backend focused on a lean multi-tenant event ticketing scope.

## Current Scope

- Public organizer/event listing and public booking submission
- Auth session lifecycle (`register/login/refresh/logout/me`)
- Organizer + event management (including publish/unpublish)
- Organizer staff assignment management
- Booking management
- Stripe checkout session creation and webhook reconciliation
- Core production middleware: security, rate limiting, validation, logging, health check

## Stack

- Node.js 20+
- Express
- Prisma + PostgreSQL
- JWT access/refresh with refresh rotation and access-token revocation
- Redis cache/revocation store (optional in development, required in production)
- Stripe Checkout + webhooks

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Run migrations and seed:

```bash
npm run prisma:migrate
npm run seed
```

4. Start API:

```bash
npm run dev
```

## Scripts

- `npm run dev` - start with nodemon
- `npm run build` - compile TypeScript
- `npm run typecheck` - no-emit type check
- `npm run seed` - seed lean test dataset
- `npm run prisma:migrate` - local dev migrations
- `npm run prisma:migrate:deploy` - deploy migrations
- `npm run prisma:generate` - regenerate Prisma client

## Key Endpoints

### Health
- `GET /health`

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Public
- `GET /api/public/organizers/:organizerId`
- `POST /api/public/organizers/:organizerId/bookings`

### Organizer + Events
- `POST /api/organizers`
- `PATCH /api/organizers/:organizerId/status`
- `GET /api/organizers/:organizerId`
- `PATCH /api/organizers/:organizerId`
- `DELETE /api/organizers/:organizerId`
- `GET /api/organizers/:organizerId/events`
- `POST /api/organizers/:organizerId/events`
- `PATCH /api/organizers/:organizerId/events/:eventId`
- `DELETE /api/organizers/:organizerId/events/:eventId`
- `GET /api/organizers/:organizerId/staff`
- `GET /api/organizers/:organizerId/staff-candidates`
- `POST /api/organizers/:organizerId/staff`
- `DELETE /api/organizers/:organizerId/staff/:userId`

### Bookings
- `GET /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`

### Payments
- `POST /api/payments/checkout-session`
- `POST /api/payments/webhook`
