# Client Agent Guide

## Purpose

This service is the Next.js frontend for the Multi-Tenant Event Intelligence Platform. Keep changes aligned with the live product flows: owner event management, staff ticket check-in, guest public event browsing/booking, analytics, and recommendation display.

## Stack

- Framework: Next.js 15 App Router
- Language: TypeScript with `strict: true`
- Package manager: npm with `package-lock.json`
- Styling: Tailwind CSS
- Data fetching: TanStack React Query
- Auth: NextAuth v5 beta
- Forms and validation: React Hook Form and Zod
- API access: Express API through `NEXT_PUBLIC_API_BASE_URL`

## Repository Shape

- `src/app`: route entries and layouts. Keep page files thin.
- `src/features`: feature-specific UI, hooks, API clients, and composition.
- `src/components`: shared UI primitives, layout, navigation, and providers.
- `src/lib`: reusable API, auth, formatting, error, and utility helpers.
- `src/validation`: shared Zod schemas.
- `src/types`: shared client contracts.
- `src/config/env.ts`: frontend environment parsing.

## Product Rules

- Owner UI must stay scoped to the organizer the owner can manage.
- Staff UI must expose only check-in and assigned organizer workflows.
- Guest/public UI must show only published events.
- Booking UI should not mark payments as confirmed; Stripe webhook confirmation belongs to the API.
- Ticket/check-in UI must treat duplicate scan errors as expected user-facing states.
- Analytics and recommendation UI should consume API/service outputs instead of deriving cross-service data in the browser.

## Change Rules

- Do not add broad state managers, form systems, or API patterns without a concrete need.
- Use the existing `apiClient` and feature API folders before creating new transport code.
- Validate inputs with existing Zod patterns rather than UI-only checks.
- Preserve NextAuth session and JWT field shape unless the task explicitly changes auth.
- Keep client/server boundaries clear; add `'use client'` only where hooks or browser APIs require it.
- Reuse existing UI primitives before adding new components.
- Avoid unrelated visual redesign while implementing backend-driven features.

## Verification

When dependencies are available, run the narrowest useful checks:

```bash
npm run typecheck
npm run build
```

Use the root Docker Compose stack for cross-service verification:

```bash
docker compose up -d --build
docker compose ps
```

If Docker Desktop is not running, report the engine blocker separately from application issues.
