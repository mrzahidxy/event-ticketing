# Starter Kit Guide

This repository is meant to be repurposed, not rewritten. The fastest path for a new project is to customize the entry points below and keep the existing architectural rhythm: validation -> API client/service -> query key -> UI.

## 1. Start With Configuration
- Update `src/config/app.ts` first.
- Set the app name, description, public URL, API base URL, and default auth routes there.
- Copy `.env.example` to `.env.local` and keep secrets out of source control.

## 2. Customize The UI Foundation
- Shared primitives live in `src/components/ui/`.
- Import directly from files under `src/components/ui/` when building new screens.
- Keep primitives simple. If a component is only useful in one feature, keep it inside that feature instead of promoting it globally.

Starter primitives available now:
- `Card`
- `Alert`
- `Skeleton`
- `Spinner`
- `FormField`
- `Separator`
- `Dialog` / `Modal`

## 3. Theme Without Rewriting Components
- Theme tokens are in `src/app/globals.css`.
- Theme behavior lives in `src/lib/theme.ts` and `src/components/providers/theme-provider.tsx`.
- The starter applies both `data-theme` and `dark`, so you can either keep the current Tailwind pattern or evolve toward a token-driven theme system later.

Recommended theme workflow:
1. Change the CSS variables in `src/app/globals.css`.
2. Keep semantic utility usage in components (`bg-card`, `text-foreground`, shared variants).
3. Only add new tokens when they solve a repeated design need.

## 4. Keep Auth Pluggable
- `src/auth/options.ts` is the NextAuth entry point.
- `src/auth/providers.ts` is where optional OAuth providers are enabled.
- `src/auth/routes.ts` is the single place for sign-in/sign-up and post-login routing defaults.

If a project needs different auth:
- Keep `SessionProvider` and middleware intact if you still use NextAuth.
- Replace providers or credential checks in isolation.
- Preserve role normalization in `src/types/user.ts` unless you intentionally change role semantics.

## 5. API Layer Pattern
- Use `apiClient` for the default app client.
- Use `createApiClient(...)` when a project needs a second client for another service or base path.
- The API client supports:
  - custom `baseUrl` / `basePath`
  - default headers and request init
  - token resolution
  - request/response hooks
  - custom error parsing
  - custom `fetch`

Preferred pattern for a new domain:
1. Add Zod schemas in `src/validation/`.
2. Add a feature API client in `src/features/<domain>/api/`.
3. Add React Query keys beside the client.
4. Consume the typed client from feature components or hooks.

## 6. Forms And Validation
- Shared schema fragments live in `src/validation/common-schema.ts`.
- Feature schemas should stay close to their domain-specific rules.
- Use `FormField` for label, hint, and error layout.
- Keep form logic in the feature layer and keep shared form primitives presentation-only.

Good default pattern:
- Zod schema for validation
- `zodResolver(...)`
- shared UI primitives for fields
- API mutation in the feature API client
- optimistic cache invalidation only where it actually helps

## 7. State Management
- Use Zustand only for client state that does not belong in the URL, server, or React Query cache.
- `src/lib/store.ts` provides a resettable store helper.
- `src/hooks/use-booking-filters.ts` shows a feature-local store.

Use React Query for:
- server data
- mutation state
- cache synchronization

Use Zustand for:
- filter UI state
- sidebar/preferences
- temporary client-only workflow state

## 8. Adding A New Feature
Use this sequence for consistency:
1. Add or update shared types and validation schema.
2. Add server/API logic.
3. Add feature API client and query keys.
4. Add feature components and page composition.
5. Reuse shared UI primitives before introducing new ones.

## 9. List Key Safety
- Do not key lists with a possibly empty/duplicated backend `id` alone.
- Use a collision-safe key shape (for example: `id + email + index`) when backend data quality cannot guarantee uniqueness.

## 10. What Not To Do
- Do not move everything into `lib/` just because it feels generic.
- Do not create wrappers around wrappers for forms, API calls, or stores.
- Do not merge admin-only UI into the global component library unless it is truly reusable.
- Do not bypass Zod, auth, or role checks for speed.

The starter is intentionally opinionated but light. Extend it where the next project has real needs, not hypothetical ones.
