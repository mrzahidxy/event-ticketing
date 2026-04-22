# Agent Guide

## Purpose
This repository is a Next.js 15 App Router starter for dashboard-style products. Any agent working here must preserve engineering quality, avoid speculative refactors, and make changes that fit the existing architecture instead of bypassing it.

## Non-Negotiable Rules
1. Do not make broad refactors unless the task explicitly asks for them.
2. Do not introduce new libraries, state managers, form systems, or API patterns without a clear need.
3. Do not "fix" unrelated inconsistencies while working on a scoped task.
4. Do not ship partial work. If you change behavior, validate it.
5. Do not bypass validation, auth, typing, or error handling just to make UI changes compile.

## Stack And Defaults
- Framework: Next.js 15 App Router with typed routes enabled.
- Language: TypeScript with `strict: true`.
- Package manager: `npm` with `package-lock.json` as the source of truth.
- Styling: Tailwind CSS.
- Data fetching and cache: TanStack React Query.
- Auth: NextAuth v5 beta with credentials and optional GitHub OAuth.
- Forms and validation: React Hook Form with Zod schemas.
- Notifications: Sonner.

## Repository Shape
- `src/app`: route entries and layouts only. Keep page files thin when possible.
- `src/features`: domain-specific UI, hooks, feature APIs, and feature composition.
- `src/components`: shared cross-feature UI primitives and providers.
- `src/lib`: reusable helpers such as API client, auth helpers, logging, formatting, and error utilities.
- `src/validation`: shared Zod schemas. Reuse these instead of duplicating validation in components.
- `src/types`: shared contracts.
- `src/server/db/memory.ts`: current in-memory persistence and seed data. Treat it as demo data infrastructure, not a place for ad hoc UI logic.

## Preferred Change Pattern
When adding or changing product behavior, keep the flow vertical and explicit:
1. Update shared types and Zod schema first when the contract changes.
2. Update server or persistence behavior next.
3. Update API helpers or feature API clients.
4. Update feature UI last.
5. Keep query keys, invalidation, and optimistic behavior consistent with the affected feature.

## Client And Server Boundaries
- Add `'use client'` only to files that need client-side hooks, browser APIs, or event handlers.
- Prefer server components for route/layout composition when no client interactivity is needed.
- Keep providers centralized under `src/components/providers`.
- Avoid moving data fetching into the client when it can stay on the server or in existing feature API helpers.

## Auth, Routing, And Role Safety
These files are high-risk and must be edited carefully:
- `src/auth/options.ts`
- `middleware.ts`
- `src/config/env.ts`
- `src/components/providers/app-provider.tsx`

Rules for this area:
- Preserve NextAuth session and JWT field shape unless the task explicitly changes auth behavior.
- Keep role checks aligned with `src/types/user.ts`.
- Verify redirects and protected routes after touching middleware or auth config.
- Do not rename routes, roles, or callback fields casually. This codebase already has some naming inconsistencies; treat them as compatibility constraints until intentionally cleaned up.

## UI And Feature Rules
- Reuse existing primitives from `src/components/ui` or the nearest feature-local UI layer before creating new ones.
- This repo contains both shared UI primitives and admin-local UI primitives. Do not merge or consolidate them as incidental cleanup.
- Keep page components focused on composition. Put substantial interaction logic in feature components, hooks, or feature API files.
- Preserve the existing visual language unless the task is explicitly a redesign.

## API, Validation, And Error Handling
- Use the existing `apiClient` in `src/lib/api/client.ts` for HTTP requests unless there is a strong reason not to.
- Validate input with Zod instead of relying on UI-only checks.
- Surface failures through existing error handling and toast patterns rather than swallowing exceptions.
- Keep request and response types explicit. Do not weaken types with `any`.

## Existing Constraints To Respect
- There are no automated tests in the repo today. Lint, typecheck, and build checks are the minimum engineering bar.
- The project uses an in-memory data store for seeded auth and booking data. Do not swap persistence approaches unless asked.
- Environment parsing is centralized. New env vars should be added through `src/config/env.ts`.
- The repo uses path aliases with `@/*`; follow that convention consistently.

## Required Verification
For code changes, run the most relevant checks before finishing:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

If a task is too small to justify all three, at minimum run the checks that exercise the changed surface and state what you did not run.

## Working Style
- Make the smallest change that fully solves the task.
- Read the surrounding feature slice before editing.
- Prefer clear code over clever code.
- Add brief comments only when they explain non-obvious intent.
- Leave unrelated files untouched.

## What Good Agent Work Looks Like
A good change in this repository is narrow, typed, validated, consistent with the existing feature structure, and verified with real checks. A bad change is one that hacks around the architecture, skips validation, edits auth or routing casually, or leaves the repo in a state that only "looks done."
