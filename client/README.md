# Multi-Tenant Event Intelligence Platform Client

Next.js frontend for the Multi-Tenant Event Intelligence Platform.

## Setup

For environment files and full-stack setup, follow the [root README](../README.md). From `client/`, with the API running, start the client:

```bash
cp .env.example .env
npm ci
npm run dev
```

PowerShell copy command:

```powershell
Copy-Item .env.example .env
```

Default local URLs:

- Client: `http://localhost:3000`
- API base URL: `http://localhost:4000`

## Environment

`client/.env.example` documents the variables read by the current client:

- `NODE_ENV`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_DESCRIPTION`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `API_INTERNAL_BASE_URL`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`

Real `.env` files are ignored by Git and must not be committed.

## Scripts

- `npm run dev` - start Next.js in development
- `npm run build` - build production assets
- `npm run start` - serve the production build
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript checks
