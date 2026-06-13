# VPS Deployment

This repo supports a simple Docker Hub + VPS deploy flow for pushes to `main`.

## What Runs In CI

- `.github/workflows/api.yml` builds and pushes `${DOCKERHUB_USERNAME}/event-ticketing-api:latest` and a SHA tag.
- `.github/workflows/client.yml` builds and pushes `${DOCKERHUB_USERNAME}/event-ticketing-client:latest` and a SHA tag.
- `.github/workflows/deploy.yml` waits for both image workflows to succeed for the same commit, SSHs into the VPS, pulls the latest images, runs `prisma migrate deploy`, restarts Compose, prunes old images, and checks `/health`.

## GitHub Secrets And Variables

Required repository secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `NEXTAUTH_SECRET`
- `AUTH_SECRET`

Recommended repository variables:

- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_BASE_URL`
- `API_INTERNAL_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_DESCRIPTION`
- `API_HEALTHCHECK_URL` for an optional external post-deploy health check

## VPS Setup

Install Docker and the Compose plugin on the VPS, then create the app directory:

```sh
sudo mkdir -p /opt/apps/event-ticketing
sudo chown "$USER":"$USER" /opt/apps/event-ticketing
```

Copy `docker-compose.prod.yml` to `/opt/apps/event-ticketing/docker-compose.prod.yml`.

Create `/opt/apps/event-ticketing/.env` from the root `.env.example` and replace every placeholder. Production values should use container hostnames:

```env
DOCKERHUB_USERNAME=your-dockerhub-username
DATABASE_URL=postgresql://postgres:strong-password@postgres:5432/event_ticketing
DIRECT_URL=postgresql://postgres:strong-password@postgres:5432/event_ticketing
REDIS_URL=redis://redis:6379
API_INTERNAL_BASE_URL=http://api:4000
```

Postgres and Redis are intentionally not published to host ports in `docker-compose.prod.yml`. Only the API and client are bound to `127.0.0.1` for a local reverse proxy such as Nginx or Caddy.

## Deploy

Push to `main`. The deploy workflow runs automatically after both Docker image workflows succeed.

Manual VPS deploy:

```sh
cd /opt/apps/event-ticketing
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose --env-file .env -f docker-compose.prod.yml up -d
docker image prune -f
curl -fsS http://127.0.0.1:4000/health
```

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
```

Then restart:

```sh
cd /opt/apps/event-ticketing
docker compose --env-file .env -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.prod.yml up -d
curl -fsS http://127.0.0.1:4000/health
```
