# Agent Guide

## Scope

This is a multi-service Multi-Tenant Event Intelligence Platform. Keep changes focused, inspect the relevant service before editing, and avoid broad rewrites unless the task explicitly asks for them.

## Service Layout

- `client`: Next.js frontend. Follow `client/agent.md` for frontend-specific work.
- `api`: Express, TypeScript, Prisma, PostgreSQL API. Follow `api/AGENT.md` for API-specific work.
- `recommendation-service`: FastAPI demo recommendation service.
- `analytics-worker`: Node.js demo analytics worker.
- `docker-compose.yml`: local multi-service runtime for Docker development.
- `.env.example`: local placeholder environment values only.

## Local Docker Workflow

Use the root Compose setup for local integration work:

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Useful logs:

```bash
docker compose logs api
docker compose logs recommendation-service
docker compose logs analytics-worker
```

Health URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000/health`
- Recommendation service: `http://localhost:8000/health`

## Change Rules

- Do not commit real secrets or replace placeholder env values with real credentials.
- Do not add production deployment, Kubernetes, VPS, Nginx, or Cloudflare config unless explicitly requested.
- Do not run database migrations from Dockerfiles or health checks.
- Keep Docker changes local-development focused unless the task says otherwise.
- Preserve existing service boundaries; do not move API code into the frontend or worker code into the API casually.
- Prefer minimal, repo-specific changes over generic scaffolding.

## Verification

Run the narrowest useful checks for the changed surface:

- Docker Compose changes: `docker compose config`
- API changes: run `npm run typecheck` or `npm run build` from `api` when dependencies are available.
- Frontend changes: run `npm run typecheck` or `npm run build` from `client` when dependencies are available.
- Python service changes: run `python -m py_compile app/main.py` from `recommendation-service`.
- Worker changes: run `node --check src/index.js` from `analytics-worker`.

If Docker Desktop is not running, report the Docker engine blocker instead of treating it as an application failure.

## Known Local Gaps

- Compose does not run Prisma migrations automatically yet.
- `analytics-worker` is currently a demo worker and has no HTTP health endpoint.
