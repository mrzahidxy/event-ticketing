# Multi-Tenant Event Intelligence Platform API

Express + Prisma backend for the Multi-Tenant Event Intelligence Platform.

## Stack

- Node.js 20+
- Express
- Prisma + PostgreSQL
- Redis through `ioredis`
- Stripe Checkout and webhooks

## Setup

Start the shared local dependencies from the repo root:

```bash
docker compose up -d postgres redis
docker compose exec redis redis-cli ping
```

Then run the API:

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

PowerShell copy command:

```powershell
Copy-Item .env.example .env
```

The default `.env.example` expects:

- PostgreSQL at `localhost:5433`
- Redis at `localhost:6379`
- API port `4000`
- API host `0.0.0.0`

## Scripts

- `npm run dev` - start with nodemon
- `npm run build` - compile TypeScript
- `npm run typecheck` - no-emit type check
- `npm run seed` - seed local test data
- `npm run db:setup` - run local migration and seed
- `npm run prisma:generate` - regenerate Prisma client
- `npm run prisma:migrate` - run local dev migrations
- `npm run prisma:migrate:deploy` - apply existing migrations non-interactively
- `npm run prisma:studio` - open Prisma Studio

## Health

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{"status":"ok"}
```

The health endpoint intentionally does not expose database, Redis, secrets, uptime, or other internals.

## Redis Verification

From the repo root:

```bash
docker compose exec redis redis-cli ping
```

Expected response:

```text
PONG
```

The API logs `Redis client connected` after startup when `REDIS_URL` is reachable. In development, the API can run without Redis; in production, `REDIS_URL` is required.

## Key Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/public/organizers/:organizerId`
- `POST /api/public/organizers/:organizerId/bookings`
- `POST /api/organizers`
- `GET /api/organizers/:organizerId`
- `PATCH /api/organizers/:organizerId`
- `DELETE /api/organizers/:organizerId`
- `GET /api/organizers/:organizerId/events`
- `POST /api/organizers/:organizerId/events`
- `PATCH /api/organizers/:organizerId/events/:eventId`
- `DELETE /api/organizers/:organizerId/events/:eventId`
- `GET /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`
- `POST /api/payments/checkout-session`
- `POST /api/payments/webhook`
