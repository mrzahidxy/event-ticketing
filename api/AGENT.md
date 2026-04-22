# Codex Agent Prompt

You are working in an Express + Prisma + PostgreSQL boilerplate.

Your job is to review the project for real issues, fix the ones you can safely address, and avoid over-engineering while doing it.

## Primary objective

- Review the codebase for bugs, unsafe behavior, broken flows, weak validation, auth or RBAC mistakes, tenant-isolation risks, inconsistent API behavior, Prisma misuse, and obvious maintainability problems that are likely to cause defects.
- Fix issues end-to-end when the right solution is clear and low risk.
- Prefer several small, defensible fixes over one broad refactor.

## Review priorities

- Start with correctness, security, auth, authorization, tenant boundaries, data consistency, and broken runtime behavior.
- Then check request validation, error handling, environment/config safety, and API contract mismatches.
- Then check seeds, docs, and developer workflow only where they are clearly stale or broken.
- Ignore purely stylistic cleanup unless it blocks correctness or creates recurring defects.

## Project rules

- Preserve the existing `routes -> controllers -> services` structure.
- Prefer incremental edits over refactors.
- Default to the smallest viable patch.
- Do not make massive, cross-cutting, or repo-wide changes unless the user explicitly requests them.
- Do not override existing behavior, architecture, naming, or file layout at large scale unless the user explicitly approves that direction.
- Do not introduce new abstractions, helper layers, patterns, or folders unless they are required to solve a concrete issue.
- Do not redesign the domain model unless the task explicitly asks for it.
- Keep dependencies unchanged unless one is strictly necessary for a fix.
- Follow the current stack: TypeScript, Express, Prisma, PostgreSQL, Zod, JWT auth, RBAC.
- Reuse existing utilities, middleware, and service patterns before adding new code.
- Keep code readable and direct. Favor simple functions and explicit logic over indirection.
- Treat this repository as a starter template with sample Organizer/Event/Booking modules. Improve only what is relevant.

## Implementation bias

- Choose pragmatic solutions over idealized architecture.
- Optimize for correctness, clarity, low risk, and delivery speed.
- Avoid speculative work.
- Avoid premature optimization.
- Avoid "future-proofing" unless the issue clearly requires extensibility.
- Do not replace working code just to make it cleaner.
- If a fix touches multiple files, keep the scope tight and justified.

## Review and fix workflow

- Read the relevant files before editing and match the current style.
- Confirm whether an issue is real before changing code.
- Fix root causes when feasible, not just symptoms, but keep the solution proportionate.
- If a possible fix would require broad edits across many files, stop and prefer a narrower fix or document the issue instead.
- Keep API behavior stable unless the current behavior is clearly incorrect or unsafe.
- Add or update validation, auth, and tenant checks only where relevant.
- Update docs, examples, or seed data only when code changes make them inaccurate or expose existing breakage.
- Run the narrowest useful verification available after each meaningful fix.
- If a suspected issue is ambiguous or high-risk, document it rather than forcing a rewrite.

## What not to do

- Do not turn a review pass into a full architecture rewrite.
- Do not perform massive rewrites, sweeping renames, bulk file moves, or broad behavior overrides.
- Do not create generic frameworks for problems that appear only once.
- Do not move files around unless necessary.
- Do not introduce broad naming or structural churn.
- Do not "clean up" unrelated code while fixing targeted issues.
- Do not reinterpret a small bugfix request as permission to modernize or restructure the project.

## Response style

- Be concise and direct.
- Present findings first, ordered by severity.
- For each fix, state what was wrong, what changed, and how it was verified.
- If you found additional issues that were not fixed, list them separately with a short reason.
- If a better long-term architecture exists, do not implement it unless requested. Mention it briefly only if it materially affects the current task.
