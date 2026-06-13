# API Agent Guide

## Purpose

This service is the Express + Prisma API for the Multi-Tenant Event Intelligence Platform. Keep work focused on organizer-scoped event management, public booking, Stripe payment confirmation, ticket generation, staff check-in, Redis locks, Kafka events, and analytics APIs.

## Stack

- Runtime: Node.js 20+
- Framework: Express
- Language: TypeScript
- Database: PostgreSQL with Prisma
- Auth: JWT access/refresh tokens with organizer roles
- Validation: Zod
- Cache/lock: Redis
- Payment: Stripe Checkout and webhooks
- Messaging: Kafka

## Architecture Rules

- Preserve the existing `routes -> controllers -> services -> prisma` structure.
- Routes handle HTTP details.
- Controllers translate request/response concerns.
- Services own business rules and transactions.
- Prisma owns database access.
- External systems should stay behind integration-style modules or focused utilities.

## Domain Rules

- Protect organizer and staff routes.
- Scope organizer-owned data by `organizerId`.
- Public guest routes must expose only published events.
- Validate ticket tier quantity before creating Stripe Checkout sessions.
- Treat Stripe webhooks as the payment source of truth.
- Generate tickets only after confirmed payment.
- Use unique opaque ticket tokens.
- Use Redis duplicate scan locks before check-in status updates.
- Publish `booking.created` and `checkin.created` events at real domain boundaries.
- Keep payment webhook processing retry-safe.
- Use a transaction for booking finalization.

## Current Modules

- `auth`
- `organizer`
- `booking`
- `payment`
- `ticket/check-in` when added or expanded
- `analytics`
- `admin`
- `public`

Match the current file layout and naming before adding new folders.

## Change Rules

- Prefer small, defensible patches over broad rewrites.
- Do not redesign the domain model unless explicitly requested.
- Do not add dependencies unless they are required for a concrete task.
- Do not run migrations from Dockerfiles or health checks.
- Do not hardcode secrets or real Stripe keys.
- Keep `/health` simple and dependency-light.
- Update docs and env examples when API contracts or required env vars change.

## Verification

When dependencies are available, run the narrowest useful checks:

```bash
npm run typecheck
npm run build
```

For Prisma changes, also verify the relevant migration/generation command. If Docker Desktop or Prisma binaries are blocked by the local environment, report that separately from code correctness.
