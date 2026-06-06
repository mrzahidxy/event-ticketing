# Project Context

This repository is the base for the **Multi-Tenant Event Intelligence Platform**.

The project extends an existing event-ticketing MVP where organizers manage tenant-scoped events and bookings, guests purchase tickets, staff check in tickets, and booking/check-in activity eventually feeds analytics summaries and recommendation outputs.

## Current Repo Baseline

The current focused local setup includes:

- `api/` Express + Prisma backend
- `client/` Next.js frontend
- PostgreSQL for application data
- Redis for cache/token revocation support
- Stripe checkout and webhook code paths

Existing working flows should be extended carefully, not rewritten casually.

## Current Setup Boundaries

- `GET /health` returns only `{ "status": "ok" }`.
- Health endpoints must not expose secrets, database state, Redis state, uptime, or internal service details.
- Real `.env` files are ignored and should not be committed.
- Docker images must not copy `.env` files into the image.
- API containers listen on `0.0.0.0`.
- The API respects `PORT`.
- Prisma migrations and seed data are run explicitly from `api/`.

## Known Limitations

- Docker Compose starts the app stack but does not automatically run Prisma migrations or seed data.
- Redis is optional during API development but required in production.
- Stripe examples use placeholders; real payment testing needs Stripe test credentials and webhook forwarding.
- `analytics-worker/` and `recommendation-service/` are present in the workspace but are outside this setup reliability pass.

## Next Project Direction

After setup reliability is stable, continue with:

- tenant isolation and role verification
- ticket-tier lifecycle hardening
- booking and payment finalization reliability
- QR ticket issuance and ticket lookup
- staff check-in and Redis duplicate-scan prevention
- Kafka event publishing
- analytics worker and summary read model
- FastAPI recommendation service
- tests, docs, diagrams, screenshots, and demo polish

## Decision Rules

- Keep tenant boundaries explicit.
- Keep payment and booking state conservative and verifiable.
- Keep API and client behavior aligned.
- Prefer small safe changes over broad rewrites.
- Treat the current codebase as the source of truth for what exists today.
