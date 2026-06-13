# Event Ticketing MVP

Multi-tenant event ticketing workspace with:

- `api/` for the Express + Prisma backend
- `client/` for the Next.js frontend

## Start here

- Product direction: [docs/project-context.md](./docs/project-context.md)
- VPS deployment: [docs/deployment.md](./docs/deployment.md)
- Agent rules: [agent.md](./agent.md)
- API setup: [api/README.md](./api/README.md)
- Client setup: [client/README.md](./client/README.md)

## Production deploy

Pushes to `main` build API and client Docker Hub images, then deploy to the VPS after both image workflows pass. See [docs/deployment.md](./docs/deployment.md) for required secrets, first-time VPS setup, health checks, and rollback.
