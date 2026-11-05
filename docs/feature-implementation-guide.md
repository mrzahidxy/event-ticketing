# Feature Implementation Guide

Use this guide when an AI agent or developer implements any feature in the Multi-Tenant Event Intelligence Platform. Keep work demo-ready, scoped, and aligned with the current service boundaries.

## Current Repo Rule

This repository already contains working MVP foundations. Before implementing any feature, inspect the existing code and extend it carefully.

Do **not** replace working auth, booking, Stripe, Prisma, Redis, or frontend flows unless the task explicitly requires it.

Treat the current source as authoritative; confirm service paths and behavior before proposing new services or changes.

## MVP Goal

Build a multi-tenant **event intelligence MVP** where organizers manage events, authenticated users buy tickets, staff check in tickets, and booking/check-in events feed analytics summaries and rule-based recommendations.

The goal is a clean, demo-ready portfolio project, not a fully commercial ticketing product.

## Users and Access

* `ADMIN`: platform-wide administration and support operations.
* `OWNER`: manages an organizer's events, ticket tiers, publishing, bookings, staff assignments, and scoped analytics.
* `STAFF`: performs check-in and permitted reads within assigned organizer scope.
* `USER`: browses published events and buys tickets after signing in.

Public event browsing does not require sign-in. Checkout is restricted to an authenticated `USER`; the client booking-history page is for that user, while API booking reads also support authorized organizer and admin scopes.

Protect organizer and staff routes. Scope organizer-owned data by `organizerId`. Public event routes must show only published events.

## Tenant Isolation Rules

Authentication is not tenant isolation. `req.auth.organizerId` is request context only and must not be the only control used to protect organizer-owned data.

* Organizer-owned reads must verify platform admin, organizer owner, or explicit organizer staff membership scope before returning data.
* Organizer writes are owner/admin only, including organizer profile updates, event create/update/delete, ticket tier management, and staff assignment changes.
* Staff access is limited to allowed operational actions for assigned organizers. Staff must not create, update, or delete events, ticket tiers, organizer profiles, or staff assignments.
* Protected organizer, analytics, booking, ticket, check-in, and payment routes must reject unauthenticated requests.
* Public routes may expose only published public data and must hide suspended organizers and unpublished events.
* Cross-organizer access attempts must return clear `403 Forbidden` or `404 Not Found` errors.
* Event and ticket-tier lookups must be scoped through the parent organizer, for example by querying with both `eventId` and `organizerId`.
* Booking, payment, check-in, and analytics lookups must scope through `organizerId` or parent event/booking ownership.
* Analytics must resolve tenant scope before aggregate queries so Organizer A users cannot infer Organizer B data.

## Included Scope

* Platform roles `ADMIN`, `OWNER`, `STAFF`, and `USER`, with organizer membership roles for owner/staff access.
* Event and ticket-tier management.
* Public event listing.
* Authenticated user booking and Stripe Checkout.
* Stripe webhook payment confirmation.
* Ticket QR/token generation after confirmed payment.
* Staff ticket check-in.
* Redis duplicate-scan prevention.
* Kafka events for `booking.created` and `checkin.created`.
* Basic analytics summary/read-model tables.
* FastAPI rule-based recommendations.
* VPS deployment workflow documentation.

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
* Deployment target: Ubuntu VPS with Docker Compose, behind an external reverse proxy such as Nginx.
* The current production Compose file includes PostgreSQL as a container; it does not configure a managed database.

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

The API currently groups code under `api/src/routes`, `controllers`, `services`, `schemas`, `utils`, and `workers`. Route/service areas include auth, organizers, users, bookings, payments, RBAC, analytics, admin, public events, and ticket check-in. Stripe, Redis, Kafka, and Prisma helpers live under `utils`; the analytics consumer and projection live under `workers`.

## Data Models

Current Prisma models:

* `User`
* `Organizer`
* `OrganizerMembership`
* `Event`
* `TicketTier`
* `Booking`
* `BookingItem`
* `Payment`
* `StripeWebhookEvent`
* `Ticket`
* `TicketCheckin`
* `EventAnalytics`
* `ProcessedDomainEvent`

Use these exact schema names when implementing; do not rename models to match alternate terminology.

## Design Rules

* Routes handle HTTP.
* Controllers translate request/response concerns.
* Services handle business logic.
* Prisma handles database access.
* External services stay inside integration modules.
* All organizer-owned queries must include `organizerId` and verify owner/member/admin scope in service logic.
* Public event queries must only return published events.
* Payment webhook processing must be retry-safe.
* Booking finalization must use a database transaction.
* Tickets must be generated only after confirmed payment.
* Check-in uses a Redis duplicate-scan guard before the PostgreSQL transaction. PostgreSQL ticket status and the unique `TicketCheckin` record remain authoritative; check-in fails closed when Redis is unavailable.
* Kafka events are published only after successful PostgreSQL transactions. There is no transactional outbox; publication failure can lose an event after the business change commits.
* The analytics worker projects booking/check-in events into `EventAnalytics`; the `/analytics/events` read-model endpoint and public popularity flow use that projection. Overview, booking, and payment reports currently aggregate transactional tables. Keep these paths distinct when documenting or changing analytics behavior.
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
* Keep public event pages limited to published events.

## Main Flows

## Booking Flow

1. Authenticated user submits booking request.
2. API validates event, ticket tier, and quantity.
3. API creates a pending booking.
4. API creates a Stripe Checkout session.
5. Stripe webhook confirms payment.
6. API finalizes booking inside a transaction.
7. API marks booking as paid/confirmed.
8. API updates sold quantity.
9. API creates tickets.
10. The PostgreSQL transaction commits; the API then publishes `booking.created` to Kafka.

Rules:

* Stripe webhook is the source of truth for payment confirmation.
* Do not generate tickets from frontend redirects.
* Repeated webhook delivery must not duplicate tickets or corrupt counts.
* Quantity validation must happen before checkout and during finalization where needed.
* Kafka publication occurs after commit and is not atomic with it; there is no transactional outbox.

## Check-In Flow

1. Staff submits ticket token.
2. API verifies organizer/staff scope and loads the ticket within that scope.
3. API validates that the ticket is eligible for check-in.
4. API acquires the Redis duplicate-scan guard.
5. A PostgreSQL transaction updates ticket status and creates the check-in record.
6. After commit, the API publishes `checkin.created` to Kafka.

Rules:

* Use Redis `SET NX` as a short-lived duplicate-scan guard before the PostgreSQL transaction.
* Duplicate scans must return a clear error.
* Staff must not check in tickets from another organizer.
* PostgreSQL ticket status and the unique check-in record are durable authority and must stay consistent; the endpoint fails closed if Redis is unavailable.
* Post-commit Kafka publication failure can leave analytics without the check-in event; there is no outbox.

## Analytics Flow

1. Worker consumes `booking.created` and `checkin.created` from Kafka.
2. Worker transactionally deduplicates each event and updates `EventAnalytics`.
3. `/analytics/events` reads that projection; other dashboard endpoints aggregate transactional data.

Rules:

* The projection is eventually consistent and can miss events that failed post-commit publication.
* Worker records processed event IDs in the same PostgreSQL transaction as the projection, protecting against duplicate delivery.
* If one event's booking events use different currencies, the worker marks the conflicting event processed and skips its projection update because `EventAnalytics` stores one currency per event.
* Analytics scope must be resolved before querying; owner and staff results are limited to authorized organizer IDs, while admins may request platform scope.

## Recommendation Flow

1. Express API gathers event/analytics data.
2. Express API calls FastAPI recommendation service.
3. FastAPI ranks by recorded all-time ticket sales, then start time and event ID for deterministic ties; it does not run trained ML.
4. Express API returns recommendations.

Rules:

* Keep recommendation logic lightweight.
* Do not add advanced ML unless explicitly requested.
* Return explanations with ranked results where useful.

### Popular Events MVP

The public homepage shows a small Popular Events section. Express includes published events currently in progress and published events with no start or end time, excludes suspended organizers and events with no recorded ticket sales, reads each event's `EventAnalytics.ticketsSold`, and sends only event IDs, optional start times, and ticket totals to the stateless FastAPI ranker. Events with only one time set are excluded because their running state is unclear. FastAPI sorts by ticket sales descending, then dated events by start time, then event ID for stable ties; undated events follow dated events when sales tie. Express validates returned IDs and builds public event cards without exposing sales or revenue totals.

The label means popular by recorded all-time ticket sales; it is not personalized or a time-based trending score. The public list uses `EventAnalytics.ticketsSold`. The `/analytics/events` endpoint exposes that all-time booking/check-in projection; overview, booking, and payment reports accept date ranges and aggregate transactional tables. Any future Happening Soon or Recently Added lists should query Express/PostgreSQL directly.

## Kafka Event Contracts

Use these event names:

```txt
booking.created
checkin.created
```

Each event uses the same envelope: `domainEventId`, `eventType`, `occurredAt`, `tenantId`, and a `data` object. `tenantId` is the organizer ID. Payload fields are event-specific:

Example `booking.created`:

```json
{
  "domainEventId": "uuid",
  "eventType": "booking.created",
  "occurredAt": "ISO_DATE",
  "tenantId": "organizer-uuid",
  "data": {
    "bookingId": 123,
    "eventId": "event-uuid",
    "quantity": 2,
    "totalAmount": "1000.00",
    "currency": "usd"
  }
}
```

Example `checkin.created`:

```json
{
  "domainEventId": "uuid",
  "eventType": "checkin.created",
  "occurredAt": "ISO_DATE",
  "tenantId": "organizer-uuid",
  "data": {
    "checkInId": 456,
    "ticketId": "ticket-uuid",
    "eventId": "event-uuid"
  }
}
```

Follow existing schema names and ID types from the repo.

## Runtime and Deployment References

See the root README for local Compose setup and [`docs/deployment.md`](./deployment.md) for the VPS workflow and its limitations.

## Implementation Flow

## 1. Inspect the Current Service First

Check real files before designing the change:

```bash
rg "<feature keyword>" api client recommendation-service
rg --files api/src client/src recommendation-service
```

Do not assume folder structure. Use the current codebase as the source of truth.

## 2. Define the User Flow

Write the smallest flow that proves the feature.

Example:

```txt
owner creates event
-> owner publishes event
-> authenticated user books ticket
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

Use Redis `SET NX` as a short-lived check-in guard; PostgreSQL remains authoritative for ticket status and the unique check-in record.

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
* Keep public event screens limited to published events.

## 7. Update Analytics or Recommendations

Only update analytics or recommendations if the feature affects those outputs.

Analytics rules:

* `/analytics/events` and public popularity use the `EventAnalytics` projection.
* Overview, booking, and payment reports currently aggregate transactional tables; describe their source and date range accurately.
* Keep tenant scope explicit and resolve it before aggregate queries.

Recommendation rules:

* Keep ranking rule-based.
* Keep logic explainable.
* Avoid ML unless a task explicitly asks for it.

## 8. Verify the Full Demo Path

Use the root README's environment, migration, and seed steps before checking cross-service behavior with Docker Compose. Stop any host-run API or client processes first to avoid port conflicts:

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
* Public event visibility: Are only published events visible publicly?
* Booking: Is requested quantity validated before checkout?
* Payment: Is Stripe webhook treated as the source of truth?
* Tickets: Are tickets generated only after confirmed payment?
* Ticket token: Is the ticket token unique and opaque?
* Check-in: Does Redis guard duplicate scans while PostgreSQL enforces durable ticket and check-in state?
* Events: Are Kafka events published for booking and check-in?
* Analytics: Does each report use and document its current source, projection or transactional data?
* Recommendations: Does FastAPI return simple rule-based results?
* API/client: Are frontend contracts updated when backend responses change?
* Demo: Can the feature be shown end to end without manual database edits?
* Docs: Are local docs or demo notes updated when behavior changes?

## Testing Focus

Add or run checks relevant to changed behavior. In this checkout, the API test script is configured but `api/tests` is absent, and the client has no test script.

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

## Done Criteria

A feature is done when the relevant parts of this demo path work:

* Owner can create and publish an event.
* An authenticated user can buy a ticket through Stripe Checkout.
* Ticket is generated after webhook confirmation.
* Staff can check in the ticket.
* Duplicate scan is blocked.
* Kafka events are published.
* Analytics summary is visible.
* Recommendations are returned.
* Local docs or demo notes are updated when behavior changes.

For smaller tasks, only the relevant subset must be complete. Do not expand scope just to satisfy unrelated done criteria.
