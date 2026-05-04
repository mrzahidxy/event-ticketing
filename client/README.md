# Client

Next.js frontend for the multi-tenant event ticketing MVP.

For product direction, see [../docs/project-context.md](../docs/project-context.md).

It contains:

- public event browsing
- auth flows
- admin and business-owner dashboard foundations
- API integration with the backend on `http://localhost:4000`

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## Main env

- `NEXTAUTH_URL`: auth callback base URL for the frontend
- `NEXT_PUBLIC_SITE_URL`: public site URL used by the client
- `NEXT_PUBLIC_API_BASE_URL`: backend API base URL
- `NEXTAUTH_SECRET`: NextAuth secret for local auth/session handling

## Local development

- Start the API first if you want login, dashboard data, or booking flows to work.
- Default frontend URL: `http://localhost:3000`
- Default backend URL: `http://localhost:4000`

## Main scripts

- `npm run dev`: start the Next.js dev server
- `npm run build`: create a production build
- `npm run lint`: run ESLint
- `npm run typecheck`: run the TypeScript project check
