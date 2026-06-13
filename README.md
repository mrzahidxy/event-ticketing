# Multi-Tenant Event Intelligence Platform

Multi-tenant event intelligence platform with an Express + Prisma API, a Next.js client, PostgreSQL, Redis-backed cache/revocation support, and Stripe checkout/webhook flows.

For feature implementation guidance, see [docs/feature-implementation-guide.md](docs/feature-implementation-guide.md). For current project boundaries, see [docs/project-context.md](docs/project-context.md).

## Local Setup

- Product direction: [docs/project-context.md](./docs/project-context.md)
- VPS deployment: [docs/deployment.md](./docs/deployment.md)
- Agent rules: [agent.md](./agent.md)
- API setup: [api/README.md](./api/README.md)
- Client setup: [client/README.md](./client/README.md)

## Production deploy

Pushes to `main` build API and client Docker Hub images, then deploy to the VPS after both image workflows pass. See [docs/deployment.md](./docs/deployment.md) for required secrets, first-time VPS setup, health checks, and rollback.
