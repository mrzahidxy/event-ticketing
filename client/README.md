# event ticketing platfrom client

A production-grade template for building SaaS dashboards, internal tools, and reusable frontend foundations with Next.js 15. It includes authentication, typed API routes, React Query, TanStack Table, React Hook Form + Zod validation, Sonner notifications, and a polished admin UI so you can focus on product features, not plumbing.

## Highlights
- Authentication with NextAuth (credentials + optional OAuth) and route protection via middleware
- Role-based access control with admin and business owner roles
- CRUD-ready booking module with Zod validation, typed APIs, React Query mutations, and toast feedback
- Dashboard primitives: metrics, quick actions, analytics charts, team management, settings panels, audit logs
- Multi-tenant admin area with tenant management capabilities
- Client/server forms powered by React Hook Form, resolver-based validation, optimistic UX patterns
- Centralised API helpers and env utilities for consistent data fetching and error handling
- Production tooling: ESLint flat config, Prettier, TypeScript strict mode, Tailwind CSS, React Query Devtools, GitHub Actions
- Vercel/Netlify ready with documented environment setup

## Quick start
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`. Seeded credentials:

- Admin: `admin@example.com` / `changeMeAdmin1!` (Access to admin area at `/admin`)
- Owner: `owner@example.com` / `changeMeOwner1!` by default (Access to business owner area at `/business-owner`)

Each user type has access to different areas of the application based on their role. The middleware handles route protection and ensures users can only access areas they're authorized to use.

## Environment variables
Copy `.env.example` to `.env` and configure:
```
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXTAUTH_SECRET=change-me
```

## Starter-kit entry points
- `src/config/app.ts` central app identity, metadata defaults, API base URL, and auth route defaults
- `src/app/globals.css` design tokens and theme-aware Tailwind-friendly CSS variables
- `src/lib/theme.ts` theme configuration, theme script generation, and dark-mode helpers
- `src/lib/api/client.ts` configurable API client with hooks for auth, request/response handling, and custom fetch implementations
- `src/lib/store.ts` minimal Zustand helper for resettable domain stores
- `src/validation/common-schema.ts` shared Zod building blocks for forms and API validation
- `STARTER_KIT.md` practical guide for customizing the boilerplate without fighting the structure

## Project structure
```
src/
  app/
    (auth)/             # public auth routes (login, register)
    (public)/           # public routes (organizer landing pages)
    admin/              # multi-tenant admin routes (overview, tenants, users, licenses, logs)
    api/                # REST-style API routes (auth, booking)
    business-owner/     # business owner dashboard routes (dashboard, analytics, bookings, team, settings)
  auth/                 # NextAuth configuration
  components/           # global UI primitives (layout, providers, charts, navigation, ui)
  config/               # runtime env parsing and app config
  features/
    admin/              # admin modules (audit logs, licenses, overview, tenants, users)
    auth/               # authentication components (login form, register form)
    business-owner/     # business owner modules (analytics, booking, dashboard, settings, team)
  hooks/                # shared hooks (booking filters)
  lib/
    api/                # ApiClient wrapper, request helpers
    auth.ts             # authentication helpers
    errors.ts           # error handling utilities
    format.ts           # data formatting utilities
    store.ts            # minimal Zustand store helper
    theme.ts            # theme utilities
    utils.ts            # generic helpers (className, formatters, etc.)
  server/
    db/                 # in-memory database
  stores/               # example app-level state stores
  types/                # shared TypeScript contracts
  validation/           # Zod validation schemas and shared schema fragments
```

## Core flows
- **Auth**: `src/auth/options.ts` exposes `auth`, `signIn`, `signOut`, and route handlers; `middleware.ts` guards dashboard routes with role-based access control.
- **Role-based Access Control**: Middleware enforces role-based access with distinct areas for admins (`/admin/*`) and business owners (`/business-owner/*`). Redirect defaults now live in `src/auth/routes.ts`.
- **Booking CRUD**: `src/app/api/bookings/*` leverages shared Zod schemas + service layer; `src/features/business-owner/booking/*` provides TanStack Table, forms, and optimistic React Query mutations.
- **Forms**: `src/components/ui/form-field.tsx`, `src/validation/common-schema.ts`, `src/features/auth/components/*`, and `src/features/business-owner/booking/components/booking-form.tsx` demonstrate the reusable React Hook Form + Zod pattern.
- **Analytics**: `src/features/business-owner/analytics/page.tsx` and `src/server/api/handlers/analytics.ts` provide the dashboard analytics UI plus reusable API patterns.
- **Team management**: `src/app/business-owner/team/page.tsx` renders users, roles, and permission summaries ready for your data, and uses collision-safe list keys when backend IDs are missing/duplicated.
- **Settings**: `src/app/business-owner/settings/page.tsx` mirrors enterprise settings UI (profile, account, appearance) with reusable components.
- **Admin**: Admin area (`src/app/admin/*`) provides multi-tenant management capabilities with dedicated sections for overview, tenants, users, licenses, and audit logs.
- **Public Menu**: Publicly accessible menu page showcasing restaurant menu items organized by sections.

## Data fetching
- Use `apiClient` (`src/lib/api`) for consistent headers, base URLs, and error handling.
- Use `createApiClient(...)` when a project needs a different base path, custom token resolution, interceptors, or a different fetch implementation.
- Shared React Query keys live in respective feature folders to keep cache invalidation colocated with domain logic.

## Reusable UI
- Shared Radix/Tailwind primitives live in `src/components/ui/`.
- Added starter primitives include cards, alerts, separators, skeletons, spinners, dialog re-exports, and form field wrappers.
- Keep project-specific admin UI inside `src/features/admin/components/ui` when it is tightly coupled to that area; promote components to `src/components/ui` only when they are genuinely cross-project.
- Prefer direct imports from concrete files under `src/components/ui/*` instead of a barrel export.

## Theming
- Theme tokens live in `src/app/globals.css`.
- Theme behavior is centralized in `src/lib/theme.ts` and `src/components/providers/theme-provider.tsx`.
- `data-theme` and the `dark` class are both applied so projects can evolve the theme system without rewriting the provider.

## State management
- Use feature-local stores for domain-specific state and keep app-wide preferences in `src/stores/`.
- `src/lib/store.ts` provides a small resettable Zustand pattern; `src/hooks/use-booking-filters.ts` shows the intended style.

## Tooling & scripts
- `npm run dev` – Next.js dev server
- `npm run build` – production build
- `npm run start` – run the built app
- `npm run lint` – ESLint (flat config + Prettier compatibility)
- `npm run typecheck` – TypeScript project check
- `npm run format` / `npm run format:write` – Prettier with import sorting
- `./api-curls.sh help` – list ready-to-run curl commands for the backend API on `localhost:4000`; override `BASE_URL`, `TOKEN`, `ORGANIZER_ID`, `DATE_FROM`, and `DATE_TO` as needed

CI workflow (`.github/workflows/ci.yml`) runs lint -> typecheck -> build on pushes/PRs.

## Version Control Hygiene
The `.gitignore` file has been optimized to focus on package.json related entries, excluding dependencies (node_modules, pnp files), testing coverage, Next.js build outputs, production builds, debug logs, local environment files, Vercel deployment files, and TypeScript build info. This ensures clean commits and prevents sensitive or generated files from being tracked.

## Deployment
### Vercel / Netlify
1. Fork or import the repo
2. Configure the environment variables above
3. Deploy—API routes and middleware work out of the box

### Docker / Render / Node host
1. `npm run build`
2. `npm start`
3. Provide environment variables via secrets/config

## Next steps
- Swap the in-memory repository (`src/server/db/memory.ts`) for your database solution (Prisma, Drizzle, Supabase, PlanetScale)
- Connect `apiClient` (`src/lib/api`) to remote services or microservices
- Duplicate the booking pattern for new modules (validation -> service -> API -> UI)
- Update `src/config/app.ts` and theme tokens before turning the starter into a new product
- Add automated tests (Vitest, Playwright, Cypress) when needed

Happy shipping!
