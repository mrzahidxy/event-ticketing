# API

Express + Prisma backend for the multi-tenant event ticketing MVP.

For product direction, see [../docs/project-context.md](../docs/project-context.md).

## Setup

```bash
cp .env.example .env
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

Runs on `http://localhost:4000`.

## Main env

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: signing key for auth tokens
- `CORS_ORIGIN`: allowed frontend origins
- `REDIS_URL`: Redis connection for revocation/runtime support
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret

## Main scripts

- `npm run dev`
- `npm run build`
- `npm run typecheck`
- `npm run seed`
- `npm run prisma:migrate`
