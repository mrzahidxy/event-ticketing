# API

Express and Prisma backend for event bookings, payments, ticketing, and analytics.

## Setup

Use the [root README](../README.md) for environment configuration, local services, migrations, seed data, and startup. The API's `.env.example` lists API-specific variables. Prisma requires both `DATABASE_URL` and `DIRECT_URL`; for host-run commands, both should use the host-published database address.

## Commands

Run these from `api/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development API |
| `npm run build` | Compile TypeScript |
| `npm run typecheck` | Run TypeScript checks without emitting files |
| `npm run prisma:migrate` | Apply local development migrations |
| `npm run prisma:migrate:deploy` | Apply existing migrations non-interactively |
| `npm run seed` | Seed local data |

After startup, the health endpoint is `http://localhost:4000/health` and interactive API documentation is at `http://localhost:4000/api-docs`.
