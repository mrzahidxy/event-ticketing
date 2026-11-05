# VPS Deployment

This repo supports a simple Docker Hub + VPS deploy flow for pushes to `main`.

## What Runs In CI

- `.github/workflows/api.yml` builds and pushes `${DOCKERHUB_USERNAME}/event-ticketing-api:latest` and a SHA tag.
- `.github/workflows/client.yml` builds and pushes `${DOCKERHUB_USERNAME}/event-ticketing-client:latest` and a SHA tag.
- `.github/workflows/recommendations.yml` builds and pushes `${DOCKERHUB_USERNAME}/event-ticketing-recommendations:latest` and a SHA tag.
- `.github/workflows/deploy.yml` is triggered after the client image workflow completes. It confirms the API, client, and recommendation image workflows succeeded for the same commit, syncs `docker-compose.prod.yml`, pulls `latest`, runs `prisma migrate deploy`, starts Compose, prunes unused images, and checks API `/health` (plus an optional external check).

## GitHub Secrets And Variables

Required repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`

Required repository secrets used by the client image build:

- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `API_INTERNAL_BASE_URL`

Repository variables:

- `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_DESCRIPTION` (optional build-time labels)
- `API_HEALTHCHECK_URL` (optional external post-deploy health check)

## VPS Setup

Install Docker and the Compose plugin on the VPS, then create the app directory:

```sh
sudo mkdir -p /opt/apps/event-ticketing
sudo chown "$USER":"$USER" /opt/apps/event-ticketing
```

Copy `docker-compose.prod.yml` to `/opt/apps/event-ticketing/docker-compose.prod.yml`.

Create `/opt/apps/event-ticketing/.env` from the root `.env.example` and replace placeholders. This Compose file includes a PostgreSQL container with a persistent Docker volume; it does not configure Neon. Database URLs must use the container hostname and port:

```env
DOCKERHUB_USERNAME=your-dockerhub-username
DATABASE_URL=postgresql://postgres:strong-password@postgres:5432/event_ticketing
DIRECT_URL=postgresql://postgres:strong-password@postgres:5432/event_ticketing
REDIS_URL=redis://redis:6379
API_INTERNAL_BASE_URL=http://api:4000
RECOMMENDATION_SERVICE_URL=http://recommendation-service:8000
```

Postgres and Redis are intentionally not published to host ports in `docker-compose.prod.yml`. Only the API and client are bound to `127.0.0.1` for a local reverse proxy such as Nginx or Caddy.
The recommendation service is available only on the Compose network and is called by the API. PostgreSQL data lives in a Docker volume; this repository does not configure database backup or restore procedures.

## Deploy

Push to `main`. After the client image workflow completes, the deploy workflow waits for the API and recommendation image workflows for the same commit, then attempts deployment if all three succeeded.

Deployment migration caveat: `api/Dockerfile` prunes development dependencies from the production image, and `prisma` is a development dependency. The workflow invokes `npx prisma migrate deploy` inside that image, so the Prisma CLI is not included locally; this step is not self-contained or verified. The workflow also has not been verified against a live VPS in this documentation pass.

Manual VPS deploy:

```sh
cd /opt/apps/event-ticketing
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose --env-file .env -f docker-compose.prod.yml up -d
docker image prune -f
curl -fsS http://127.0.0.1:4000/health
```

The migration command above has the same Prisma CLI caveat; validate the migration runner before relying on this manual procedure.

Image rollback does not revert database migrations or restore data. Confirm database compatibility and recovery separately before relying on rollback for a release.

## Health Check

The deploy workflow always checks:

```sh
curl -fsS http://127.0.0.1:4000/health
```

For an external check, set the GitHub Actions repository variable `API_HEALTHCHECK_URL`, for example:

```env
API_HEALTHCHECK_URL=https://api.your-domain.com/health
```

## Rollback

The workflows also push SHA-tagged images. To roll back, edit `/opt/apps/event-ticketing/docker-compose.prod.yml` on the VPS and replace `latest` with the last known good image tags:

```yaml
image: your-dockerhub-username/event-ticketing-api:<sha>
image: your-dockerhub-username/event-ticketing-client:<sha>
image: your-dockerhub-username/event-ticketing-recommendations:<sha>
```

Then restart:

```sh
cd /opt/apps/event-ticketing
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d
curl -fsS http://127.0.0.1:4000/health
```
