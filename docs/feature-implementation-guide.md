# Feature Implementation Guide

Use this guide when an AI agent or developer implements any feature in the Multi-Tenant Event Intelligence Platform. Keep work demo-ready, scoped, and aligned with the current service boundaries.

## Current Repo Rule

This repository already contains working MVP foundations. Before implementing any feature, inspect the existing code and extend it carefully.

Do **not** replace working auth, booking, Stripe, Prisma, Redis, or frontend flows unless the task explicitly requires it.

Some target services may not exist yet. Only add missing services when the active task requires them.

## MVP Goal

Build a multi-tenant **event intelligence MVP** where organizers manage events, guests buy tickets, staff check in tickets, and booking/check-in events feed analytics summaries and rule-based recommendations.

The goal is a clean, demo-ready portfolio project, not a fully commercial ticketing product.

## Users and Access

* `OWNER`: manages organizer events, ticket tiers, publishing, bookings, analytics, and recommendations.
* `STAFF`: validates and checks in tickets for assigned organizer scope.
* `GUEST`: views published events and buys tickets without an account.

Guests are public users by default and do not need accounts unless a task explicitly introduces guest authentication.

Protect organizer and staff routes. Scope organizer-owned data by `organizerId`. Public guest routes must show only published events.

## Tenant Isolation Rules

Authentication is not tenant isolation. `req.auth.organizerId` is request context only and must not be the only control used to protect organizer-owned data.

* Organizer-owned reads must verify platform admin, organizer owner, or explicit organizer staff membership scope before returning data.
* Organizer writes are owner/admin only, including organizer profile updates, event create/update/delete, ticket tier management, and staff assignment changes.
* Staff access is limited to allowed operational actions for assigned organizers. Staff must not create, update, or delete events, ticket tiers, organizer profiles, or staff assignments.
* Protected organizer, analytics, booking, ticket, check-in, and payment routes must reject guests/public users.
* Public routes may expose only published public data and must hide suspended organizers and unpublished events.
* Cross-organizer access attempts must return clear `403 Forbidden` or `404 Not Found` errors.
* Event and ticket-tier lookups must be scoped through the parent organizer, for example by querying with both `eventId` and `organizerId`.
* Booking, payment, check-in, and analytics lookups must scope through `organizerId` or parent event/booking ownership.
* Analytics must resolve tenant scope before aggregate queries so Organizer A users cannot infer Organizer B data.

## Included Scope

* Organizer login with `OWNER` and `STAFF` roles.
* Event and ticket-tier management.
* Public event listing.
* Guest booking and Stripe Checkout.
* Stripe webhook payment confirmation.
* Ticket QR/token generation after confirmed payment.
* Staff ticket check-in.
* Redis duplicate-scan prevention.
* Kafka events for `booking.created` and `checkin.created`.
* Basic analytics summary/read-model tables.
* FastAPI rule-based recommendations.
* Lightweight VPS deployment documentation and demo guide.

## Out of Scope

Do not add these unless a future task explicitly asks for them:

* Refunds
* Coupons
* Seat maps
* Waitlists
* Advanced ML
* Full BI dashboards
* Kubernetes
* Complex production platform work
* Multi-payment-provider support
* Mobile app

## Tech Stack

* Frontend: Next.js
* Backend: Express.js and Node.js
* Database: PostgreSQL with Prisma
* Payment: Stripe Checkout
* Cache and lock: Redis
* Messaging: Kafka
* Recommendation service: FastAPI
* Local runtime: Docker Compose
* Deployment target: Ubuntu VPS with Docker Compose and Nginx
* Production PostgreSQL target: managed Neon database

## Architecture

```txt
Next.js Client
  -> Express API
      -> PostgreSQL / Prisma
      -> Stripe
      -> Redis
      -> Kafka
      -> FastAPI Recommendation Service
      -> Analytics Worker
```

## Backend Modules

Use existing folders and conventions where possible.

Expected backend modules:

* `auth`
* `events`
* `ticket-tiers`
* `bookings`
* `payments`
* `tickets`
* `checkins`
* `analytics`
* `recommendations`
* integrations:

  * Stripe
  * Redis
  * Kafka

## Data Models

Expected domain models:

* `Organizer`
* `User`
* `Event`
* `TicketTier`
* `Booking`
* `Payment`
* `Ticket`
* `CheckIn`
* `AnalyticsSummary`

Use the actual Prisma schema names when implementing. If the schema uses a slightly different name, such as `TicketCheckin`, follow the existing schema instead of renaming casually.

Do not rename models casually just to match this document.

## Design Rules

* Routes handle HTTP.
* Controllers translate request/response concerns.
* Services handle business logic.
* Prisma handles database access.
* External services stay inside integration modules.
* All organizer-owned queries must include `organizerId` and verify owner/member/admin scope in service logic.
* Public guest queries must only return published events.
* Payment webhook processing must be retry-safe.
* Booking finalization must use a database transaction.
* Tickets must be generated only after confirmed payment.
* Check-in must use a Redis duplicate lock before updating ticket status.
* Kafka events should be published only after successful domain state changes.
* Analytics should use summary/read-model tables, not expensive raw dashboard queries.
* Recommendations should stay rule-based and explainable.
* Keep `/health` endpoints simple and dependency-light.
* Do not run migrations from Dockerfiles or health checks.

## Health Endpoint Rules

`/health` should stay minimal.

Expected response:

```json
{ "status": "ok" }
```

Do **not** expose:

* secrets
* database state
* Redis state
* Kafka state
* Stripe state
* uptime
* environment variables
* internal service details

Do not check PostgreSQL, Redis, Kafka, Stripe, uptime, environment variables, or internal service state from `/health` unless a task explicitly asks for a separate readiness endpoint.

## API and Frontend Contract Rules

When changing API behavior:

* Update backend validation/schema.
* Update frontend API client code.
* Update frontend types/normalizers if they exist.
* Keep response shapes consistent.
* Avoid breaking existing UI flows silently.

When changing frontend behavior:

* Keep page files thin.
* Put business behavior in existing feature folders where possible.
* Do not expose cross-organizer data in owner/staff UI.
* Keep guest-facing pages limited to published public events.

## Main Flows

## Booking Flow

1. Guest submits booking request.
2. API validates event, ticket tier, and quantity.
3. API creates a pending booking.
4. API creates a Stripe Checkout session.
5. Stripe webhook confirms payment.
6. API finalizes booking inside a transaction.
7. API marks booking as paid/confirmed.
8. API updates sold quantity.
9. API creates tickets.
10. API publishes `booking.created`.

Rules:

* Stripe webhook is the source of truth for payment confirmation.
* Do not generate tickets from frontend redirects.
* Repeated webhook delivery must not duplicate tickets or corrupt counts.
* Quantity validation must happen before checkout and during finalization where needed.

## Check-In Flow

1. Staff submits ticket token.
2. API creates Redis scan lock.
3. API validates ticket.
4. API verifies organizer/staff scope.
5. API marks ticket checked in.
6. API creates check-in record.
7. API publishes `checkin.created`.

Rules:

* Use Redis atomic lock before updating ticket status.
* Duplicate scans must return a clear error.
* Staff must not check in tickets from another organizer.
* Ticket status and check-in record must stay consistent.

## Analytics Flow

1. Worker consumes `booking.created` and `checkin.created`.
2. Worker updates summary/read-model tables.
3. API returns analytics summary to owner.

Rules:

* Analytics should be read-model based.
* Worker handling should be safe for repeated event delivery.
* Owner analytics routes must be tenant-scoped.

## Recommendation Flow

1. Express API gathers event/analytics data.
2. Express API calls FastAPI recommendation service.
3. FastAPI ranks events using simple explainable rules.
4. Express API returns recommendations.

Rules:

* Keep recommendation logic lightweight.
* Do not add advanced ML unless explicitly requested.
* Return explanations with ranked results where useful.

## Kafka Event Contracts

Use these event names:

```txt
booking.created
checkin.created
```

Events should include:

* `eventType`
* `eventId`
* `organizerId`
* timestamp
* relevant IDs
* relevant metrics

Example `booking.created`:

```json
{
  "eventType": "booking.created",
  "bookingId": "string",
  "eventId": "string",
  "organizerId": "string",
  "ticketTierId": "string",
  "quantity": 2,
  "amountTotal": 1000,
  "createdAt": "ISO_DATE"
}
```

Example `checkin.created`:

```json
{
  "eventType": "checkin.created",
  "checkInId": "string",
  "ticketId": "string",
  "eventId": "string",
  "organizerId": "string",
  "staffUserId": "string",
  "createdAt": "ISO_DATE"
}
```

Follow existing schema names and ID types from the repo.

## Docker Compose Services

Target local services for the complete local demo:

* `frontend`
* `api`
* `postgres`
* `redis`
* `kafka`
* `recommendation-service`
* `analytics-worker`

These are target services for the complete demo. Some may not exist yet. Do not create missing services unless the current task asks for them.

Target VPS services:

* `api`
* `redis`
* `recommendation-service`
* `analytics-worker`
* `kafka`, if needed for the demo VPS

Production PostgreSQL should use managed Neon instead of local VPS PostgreSQL.

## Implementation Flow

## 1. Inspect the Current Service First

Check real files before designing the change:

```bash
rg "<feature keyword>" api client recommendation-service analytics-worker
```

Also check relevant files such as:

```bash
find api -maxdepth 3 -type f
find client -maxdepth 4 -type f
```

Do not assume folder structure. Use the current codebase as the source of truth.

## 2. Define the User Flow

Write the smallest flow that proves the feature.

Example:

```txt
owner creates event
-> owner publishes event
-> guest books ticket
-> Stripe webhook confirms payment
-> ticket is generated
-> staff checks in ticket
```

Keep the implementation demo-ready and minimal.

## 3. Update the Backend Contract

For API features, keep the flow inside the existing Express structure:

```txt
routes -> controllers -> services -> prisma
```

Implementation rules:

* Validate input with existing schemas.
* Enforce auth and role checks.
* Apply `organizerId` scoping in service/database queries.
* Return consistent API responses.
* Avoid mixing HTTP response logic into business services.

## 4. Update Persistence Intentionally

If schema changes are required:

* Update Prisma schema.
* Add migration.
* Update seed data if needed.
* Update service queries.
* Update tests or verification scripts.

Do not fake multi-tenant behavior in memory or UI state.

Do not generate tickets before confirmed payment.

## 5. Update Event and Cache Behavior

Use Redis for duplicate check-in prevention.

Publish Kafka events only at real domain boundaries:

```txt
booking.created
checkin.created
```

Do not publish events for failed, duplicate, or incomplete operations.

## 6. Update Frontend Surfaces

For UI changes:

* Keep page files thin.
* Use existing feature folders where possible.
* Update API clients/types.
* Handle loading and error states clearly.
* Keep owner/staff screens tenant-safe.
* Keep public guest screens limited to published events.

## 7. Update Analytics or Recommendations

Only update analytics or recommendations if the feature affects those outputs.

Analytics rules:

* Use summary/read-model tables.
* Avoid querying raw transactional tables for dashboard-heavy responses.
* Keep tenant scope explicit.

Recommendation rules:

* Keep ranking rule-based.
* Keep logic explainable.
* Avoid ML unless a task explicitly asks for it.

## 8. Verify the Full Demo Path

Use Docker Compose when checking cross-service behavior:

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:4000/health
curl http://localhost:8000/health
```

Adjust ports if the repo uses different values.

## Feature Checklist

Before marking a feature done, check:

* Auth: Are protected routes limited to the correct roles?
* Tenant scope: Are organizer queries constrained by `organizerId`?
* Guest visibility: Are only published events visible publicly?
* Booking: Is requested quantity validated before checkout?
* Payment: Is Stripe webhook treated as the source of truth?
* Tickets: Are tickets generated only after confirmed payment?
* Ticket token: Is the ticket token unique and opaque?
* Check-in: Are duplicate scans blocked with Redis?
* Events: Are Kafka events published for booking and check-in?
* Analytics: Are summary/read-model tables updated where needed?
* Recommendations: Does FastAPI return simple rule-based results?
* API/client: Are frontend contracts updated when backend responses change?
* Demo: Can the feature be shown end to end without manual database edits?
* Docs: Are local docs or demo notes updated when behavior changes?

## Deployment Track

Only add deployment work when the task asks for it.

The target deployment shape is:

* Ubuntu VPS running Docker Compose.
* GitHub Actions builds images and pushes to Docker Hub.
* VPS pulls images and restarts the Compose stack.
* Nginx routes HTTPS traffic to local app ports.
* Cloudflare manages DNS.
* Certbot manages SSL certificates.
* PostgreSQL uses a managed provider such as Neon.
* Redis can run as a private Docker container.
* Uptime Kuma monitors health endpoints.
* Beszel monitors VPS/container resources.

Do not add:

* Kubernetes
* production platform abstractions
* real secrets
* complex observability
* multi-region deployment
* cloud-native platform work

## Deployment Rules

* Push to `main` triggers GitHub Actions.
* GitHub Actions builds Docker images and pushes to Docker Hub.
* VPS pulls the latest image and restarts the Compose stack.
* Keep production Compose files under:

```txt
/opt/apps/event-ticketing
```

* Keep `.env` only on the VPS or in GitHub Secrets.
* Bind app containers to localhost, not a public IP.
* Expose only SSH, HTTP, and HTTPS publicly.
* Run Prisma migrations in production with:

```bash
prisma migrate deploy
```

* Do not use this in production:

```bash
prisma migrate dev
```

* Use Docker Hub image tags such as:

```txt
latest
<commit-sha>
```

* Nginx routes HTTPS traffic.
* Cloudflare manages DNS.
* Certbot manages SSL.
* Uptime Kuma checks `/health`.
* Beszel monitors VPS and container resources.

## Testing Focus

Prioritize tests or verification scripts for:

* Auth and roles
* Tenant isolation
* Event publishing flow
* Ticket-tier lifecycle
* Booking validation
* Stripe webhook finalization
* Ticket generation
* Duplicate check-in prevention
* Kafka event publishing
* Analytics summary updates
* Recommendation response
* Deployment health check

## Build Order

Use this order unless the active task says otherwise:

1. Docker setup
2. Database schema
3. Core Express modules
4. Event and ticket-tier APIs
5. Booking and Stripe webhook
6. Ticket and check-in flow
7. Redis duplicate prevention
8. Kafka and analytics worker
9. FastAPI recommendation service
10. VPS deployment
11. README and demo guide

## Done Criteria

A feature is done when the relevant parts of this demo path work:

* Owner can create and publish an event.
* Guest can buy a ticket through Stripe Checkout.
* Ticket is generated after webhook confirmation.
* Staff can check in the ticket.
* Duplicate scan is blocked.
* Kafka events are published.
* Analytics summary is visible.
* Recommendations are returned.
* Local docs or demo notes are updated when behavior changes.

For smaller tasks, only the relevant subset must be complete. Do not expand scope just to satisfy unrelated done criteria.
