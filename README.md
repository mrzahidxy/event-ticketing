# Multi-Tenant Event Intelligence Platform

Multi-tenant event intelligence platform with an Express + Prisma API, a Next.js client, PostgreSQL, Redis-backed cache/revocation support, and Stripe checkout/webhook flows.

For feature implementation guidance, see [docs/feature-implementation-guide.md](docs/feature-implementation-guide.md). For current project boundaries, see [docs/project-context.md](docs/project-context.md).

## Local Setup

### Required tools

- Node.js 20+
- npm
- Docker Desktop with Docker Compose v2

### 1. Start Postgres and Redis

```bash
docker compose up -d postgres redis
docker compose ps
docker compose exec redis redis-cli ping
```

Expected Redis response:

```text
PONG
```

### 2. Configure the API

```bash
cd api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

PowerShell copy command:

```powershell
Copy-Item .env.example .env
```

The default API example env points to the Compose Postgres container published on `localhost:5433` and Redis on `localhost:6379`.

### 3. Configure the client

Open a second terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

PowerShell copy command:

```powershell
Copy-Item .env.example .env
```

### Local URLs

- Client: `http://localhost:3000`
- API: `http://localhost:4000`
- API docs: `http://localhost:4000/api-docs`
- API health: `http://localhost:4000/health`
- Postgres: `localhost:5433`
- Redis: `localhost:6379`

### Health Check

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{"status":"ok"}
```

### Full Docker Build Check

After the database has been migrated and seeded, the app containers can be built and started:

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:4000/health
```

Docker images do not copy local `.env` files. Runtime configuration is passed through Compose environment variables.

### Database Commands

Run these from `api/`:

```bash
npm run prisma:migrate
npm run seed
npm run prisma:studio
```

For applying existing migrations in a non-interactive environment:

```bash
npm run prisma:migrate:deploy
```

### Reset Local Data

```bash
docker compose down -v
docker compose up -d postgres redis
cd api
npm run prisma:migrate
npm run seed
```

## Environment Files

- Root `.env.example` is for Docker Compose.
- `api/.env.example` is for the local Express API.
- `client/.env.example` is for the local Next.js client.
- In Docker Compose, browser-facing client calls use `NEXT_PUBLIC_API_BASE_URL`, while server-side auth calls use `API_INTERNAL_BASE_URL=http://api:4000`.
- Real `.env` files are ignored by Git and must not be committed.

## Known Limitations

- Compose does not automatically run Prisma migrations or seed data. Run the API Prisma commands explicitly before relying on app data.
- Redis is optional in API development but required in production by the API env validation.
- Stripe keys in examples are placeholders; real checkout/webhook testing requires local Stripe test credentials and webhook forwarding.
- `analytics-worker/` and `recommendation-service/` are present in the workspace but are not part of this focused local API/client setup.
