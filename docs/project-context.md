# Project Context

This repo is the implementation workspace for a **multi-tenant event ticketing MVP**.

## What we are building

The product goal is:

- organizers manage tenant-scoped events, bookings, and staff access
- guests browse public events and purchase tickets
- Stripe handles checkout and the backend finalizes bookings from verified webhooks
- the platform grows toward QR tickets, check-in, analytics, and recommendations

## What matters in this repo

These are the main implementation constraints:

- tenant isolation is mandatory for organizer-owned data
- payment confirmation must come from Stripe webhook processing, not frontend redirects
- backend and frontend contract changes must stay aligned across both apps
- the backend should stay a modular monolith unless a change clearly requires more
- existing working flows should be extended carefully, not rewritten casually
- avoid over-engineering; prefer the smallest safe change that solves the task

## Current repo shape

- `api/`: Express + Prisma backend with JWT auth, organizer/event flows, public booking flow, Stripe checkout, and webhook handling
- `client/`: Next.js frontend with admin/business-owner foundations and public-facing app structure

## Current MVP baseline

What already exists in some form:

- auth and role-based access
- organizer and event management
- public event browsing
- booking flow
- Stripe checkout and webhook integration
- Redis in the backend stack

## Next work that this context should guide

Main missing or partial areas:

- stronger ticket-tier lifecycle support
- QR ticket issuance
- ticket validation and check-in flow
- duplicate-scan protection
- analytics aggregation and reporting tables
- recommendation-service integration
- reliable event publishing for downstream analytics

## How to use this document

Use this as the project brief when making decisions:

- keep tenant boundaries explicit
- keep payment and booking state conservative and verifiable
- keep API and client behavior aligned when one side changes
- prefer small changes over over-engineered abstractions
- treat the current codebase as the source of truth for what exists today

This document sets product direction. Execution rules for agents live in [`../agent.md`](../agent.md).

## Source

Primary reference:

- [ClickUp docs](https://app.clickup.com/90181612367/v/dc/2kzkwcuf-2358/2kzkwcuf-2918)

If the current codebase and the source materials differ, use the ClickUp task as the product brief and refactor carefully without breaking working flows.
