# Repository Constraints

- `/health` returns only `{ "status": "ok" }`; it is not a dependency-readiness check.
- Host-run API commands connect to PostgreSQL through the published host port; containers use the Compose service hostname.
- Redis is optional for most host-run API flows, but check-in fails closed without it. Token/session state falls back to process memory when Redis is unavailable; production configuration requires `REDIS_URL` for durable state.
- Keep real `.env` files out of version control and Docker images.
- API containers listen on `0.0.0.0` and respect `PORT`.
