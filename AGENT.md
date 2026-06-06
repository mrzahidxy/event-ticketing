# Agent Guide

## Purpose

This repository is a two-part implementation workspace for a **multi-tenant event ticketing MVP**:

- `api/` contains the Express + Prisma backend
- `client/` contains the Next.js 15 frontend

This file defines repo-level guidance. Product and architecture context lives here:

- [`docs/project-context.md`](./docs/project-context.md)

## Core Rule

Avoid over-engineering. Make the smallest change that solves the task without breaking existing behavior.

## Priorities

1. Preserve tenant isolation for organizer-scoped data and actions.
2. Preserve payment correctness. Stripe webhook confirmation is the source of truth for finalized bookings.
3. Keep backend and frontend contracts aligned when behavior changes cross app boundaries.
4. Prefer narrow, low-risk fixes over refactors or redesigns.
5. Keep work aligned with the current MVP direction in `docs/project-context.md`.

## Working Rules

- Read the relevant app guide before editing code in `api/` or `client/`.
- Reuse existing utilities, validation, auth, and feature patterns before adding new code.
- Do not change working architecture, naming, or flow structure unless the task requires it.
- Do not perform repo-wide cleanup, renames, or restructures unless explicitly requested.
- Do not fix unrelated issues while doing a scoped task.
- Do not add abstractions, helpers, or layers unless they remove a real problem in the current task.
- Keep documentation updated only when behavior, contracts, or setup materially change.

## Boundaries

- Put backend business rules in `api/`.
- Put frontend UI composition and client behavior in `client/`.
- Do not duplicate business logic across both apps unless the boundary requires it.
- If a change affects both apps, verify both sides instead of patching only one.

## High-Risk Areas

Edit carefully when touching:

- auth and session handling
- RBAC or staff/owner permission logic
- organizer scoping and tenant filters
- booking finalization and payment reconciliation
- middleware, route protection, and environment configuration

## Verification

Run the narrowest useful checks for the changed area:

- backend changes: relevant `api` checks
- frontend changes: relevant `client` checks
- cross-app changes: verify both sides

If you skip verification, state that clearly.

## Good Agent Work

Good work in this repo is scoped, tenant-safe, contract-aware, and verified. Bad work is over-engineered, cross-cutting, or casually breaks auth, payment, tenant scoping, or existing working flows.
