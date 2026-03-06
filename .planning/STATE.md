# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** A seller connects their MELI account and immediately sees which listings are losing money — before spending a single minute configuring anything else.
**Current focus:** Phase 1 — Project Foundation + Auth

## Current Position

Phase: 1 of 4 (Project Foundation + Auth)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-03-06 — Completed 01-01 (Next.js scaffold, Tailwind, ESLint, Prettier, route groups)

Progress: [█░░░░░░░░░] 6%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 4 min
- Total execution time: 0.07 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-project-foundation-auth | 1/4 | 4 min | 4 min |

**Recent Trend:**
- Last 5 plans: 4 min
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Next.js 15 + Better Auth + Neon/Prisma + Inngest + Resend + Vercel chosen for minimal ops overhead
- Init: Argentina-only for v1; OAuth URL patterns parameterized for future multi-country support
- Init: price_snapshots table included in Phase 1 schema to accumulate competitor data for v2 (El Radar)
- Init: Multi-tenant `account_id` scoping required on all DB tables from day 1
- 01-01: Next.js 16 (latest) used instead of 15 — create-next-app@latest installs 16.1.6; stable and forward-compatible
- 01-01: Tailwind v4 used (not v3) — @import syntax, no tailwind.config.ts required
- 01-01: Flat ESLint config (eslint.config.mjs) instead of .eslintrc.json — Next.js 16 default
- 01-01: eslint . used instead of next lint — next lint subcommand removed in Next.js 16

### Pending Todos

None.

### Blockers/Concerns

- MELI app registration (APP_ID + SECRET_KEY) must be completed before Phase 2 OAuth work can start. Register at developers.mercadolibre.com.ar and create MELI test accounts.

## Session Continuity

Last session: 2026-03-06
Stopped at: Completed 01-01-PLAN.md — Next.js scaffold complete. Ready for 01-02 (database schema).
Resume file: None
