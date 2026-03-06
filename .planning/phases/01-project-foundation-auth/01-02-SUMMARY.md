---
phase: 01-project-foundation-auth
plan: 02
subsystem: database
tags: [prisma, postgres, neon, schema, multi-tenant, prisma-7, neon-adapter]

# Dependency graph
requires:
  - phase: 01-01
    provides: Next.js 16 scaffold with TypeScript and .env.example
provides:
  - Full 12-model Prisma schema covering all 5 product phases
  - PriceSnapshot table deployed from Phase 1 for early competitor data accumulation
  - src/lib/db.ts PrismaClient singleton using @prisma/adapter-neon
  - prisma.config.ts configured to load .env.local for CLI commands
  - db:push, db:studio, db:generate npm scripts
affects:
  - 01-03-auth-implementation
  - 01-04-ci-cd-deployment
  - 02-meli-oauth
  - 03-margin-calculator
  - 04-alerts

# Tech tracking
tech-stack:
  added:
    - prisma@7.4.2
    - "@prisma/client@7.4.2"
    - "@prisma/adapter-neon@7.4.2"
    - "@neondatabase/serverless@1.0.2"
    - dotenv@17.3.1
  patterns:
    - Prisma 7 with @prisma/adapter-neon — URL stays out of schema.prisma, passed via PrismaClient constructor
    - prisma.config.ts loads .env.local via dotenv for CLI commands
    - All business-logic tables have accountId field for multi-tenant row-level isolation
    - PrismaClient singleton pattern via globalForPrisma to prevent hot-reload connection exhaustion

key-files:
  created:
    - prisma/schema.prisma
    - prisma.config.ts
    - src/lib/db.ts
  modified:
    - package.json

key-decisions:
  - "Prisma 7 (not 5/6) installed — requires @prisma/adapter-neon instead of datasource url in schema; db.ts uses adapter pattern"
  - "datasource url removed from schema.prisma (Prisma 7 requirement) — url configured in prisma.config.ts for CLI and PrismaClient constructor for runtime"
  - "All 12 models written upfront (Phase 1-5 forward-compatible) to avoid painful retroactive migrations"
  - "PriceSnapshot created in Phase 1 to begin accumulating competitor data before Phase 2 (El Radar) ships"

patterns-established:
  - "Multi-tenant isolation: every business table has accountId String referencing Account model"
  - "Prisma 7 runtime: PrismaClient receives adapter from @prisma/adapter-neon, not datasource url"
  - "Env loading: prisma.config.ts uses dotenv to load .env.local first, .env as fallback"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 1 Plan 02: 12-model multi-tenant Prisma schema with Neon serverless adapter for all 5 product phases

**Forward-compatible 12-model Prisma schema covering Phases 1-5 pushed to Neon via @prisma/adapter-neon, with PriceSnapshot table live from day 1 to begin accumulating competitor data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T03:36:28Z
- **Completed:** 2026-03-06T03:41:44Z
- **Tasks:** 2
- **Files modified:** 4 created, 2 modified

## Accomplishments
- 12-model Prisma schema written covering all 5 phases: User/Session/AuthAccount/Verification (Better Auth), Account, MeliConnection, Item, Order, ProductCost, MarginResult, PriceSnapshot, Alert
- All business-logic models (Account through Alert) have `accountId` field for multi-tenant row isolation
- PriceSnapshot table included from Phase 1 — price/quantity snapshots will accumulate before Phase 2 analysis feature ships
- src/lib/db.ts exports `db` singleton using Prisma 7 + @prisma/adapter-neon pattern
- `npx prisma validate` exits 0; TypeScript compiles clean
- db:push, db:studio, db:generate scripts added to package.json

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Prisma and write the full multi-tenant schema** - `1def8ec` (feat)
2. **Task 2: Set up .env.local, Neon adapter, and Prisma Client singleton** - `91f1032` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - 12-model multi-tenant schema for all 5 phases
- `prisma.config.ts` - Prisma 7 config loading .env.local for CLI commands, datasource url for db push
- `src/lib/db.ts` - PrismaClient singleton with @prisma/adapter-neon, hot-reload safe via globalForPrisma
- `package.json` - Added db:push, db:studio, db:generate scripts; prisma, @prisma/client, @prisma/adapter-neon, @neondatabase/serverless, dotenv dependencies

## Decisions Made
- **Prisma 7 adapter pattern:** Prisma 7 removed `url` from schema.prisma datasource block. URL is now passed via `prisma.config.ts` (for CLI) and directly to `PrismaClient({ adapter })` constructor (for runtime). Used `@prisma/adapter-neon` which is the recommended Neon+Prisma 7 integration.
- **PrismaNeon takes PoolConfig, not Pool instance:** `new PrismaNeon({ connectionString })` is the correct constructor — not `new PrismaNeon(pool)`. Fixed type error by removing Pool instantiation.
- **dotenv loaded explicitly in prisma.config.ts:** Next.js auto-loads `.env.local` but the Prisma CLI doesn't. Added explicit `dotenv.config({ path: '.env.local' })` so `npm run db:push` works without duplicating env vars to `.env`.
- **Forward-compatible schema:** Wrote all 12 models now to avoid retroactive migrations when Phase 2-5 features ship.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma 7 schema.prisma no longer supports `url`/`directUrl` in datasource**
- **Found during:** Task 1 (schema validation)
- **Issue:** Plan schema had `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` in datasource block. Prisma 7 removed these — they cause P1012 validation error.
- **Fix:** Removed url/directUrl from schema.prisma datasource. Added url to `prisma.config.ts` datasource object (for CLI). Configured runtime URL via PrismaClient adapter in db.ts.
- **Files modified:** prisma/schema.prisma, prisma.config.ts
- **Verification:** `npx prisma validate` exits 0
- **Committed in:** 1def8ec, 91f1032

**2. [Rule 2 - Missing Critical] Added @prisma/adapter-neon for Prisma 7 runtime connectivity**
- **Found during:** Task 2 (creating db.ts)
- **Issue:** In Prisma 7, `PrismaClient` with engine type "client" (new default) requires either `adapter` or `accelerateUrl`. Plain `new PrismaClient()` throws "Using engine type client requires either adapter or accelerateUrl".
- **Fix:** Installed `@prisma/adapter-neon` and `@neondatabase/serverless`. Updated db.ts to pass `new PrismaNeon({ connectionString })` as the adapter. Updated prisma.config.ts to use `datasource.url` (for CLI) not `adapter`.
- **Files modified:** src/lib/db.ts, package.json
- **Verification:** `npx tsc --noEmit` exits 0; Prisma generate succeeds
- **Committed in:** 91f1032

**3. [Rule 1 - Bug] Fixed PrismaNeon constructor — takes PoolConfig, not Pool instance**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** Initial db.ts created a `new Pool()` and passed it to `new PrismaNeon(pool)`. PrismaNeon constructor signature is `(config: neon.PoolConfig)` not `(pool: neon.Pool)`. Type error `Argument of type 'Pool' is not assignable to parameter of type 'PoolConfig'`.
- **Fix:** Removed Pool instantiation. Pass `{ connectionString: process.env.DATABASE_URL }` directly to PrismaNeon.
- **Files modified:** src/lib/db.ts, prisma.config.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 91f1032

---

**Total deviations:** 3 auto-fixed (1 bug — Prisma 7 schema breaking change, 1 missing critical — adapter required, 1 bug — wrong constructor signature)
**Impact on plan:** All fixes required to run on Prisma 7. No scope changes. All 12 models and multi-tenant design exactly as planned. Schema validate passes.

## Issues Encountered
- Prisma 7.4.2 is a major breaking version from the Prisma 5/6 the plan was written for. Key changes: `url` removed from schema.prisma datasource, PrismaClient requires `adapter` or `accelerateUrl`, `datasources` constructor option removed. All handled automatically via deviation rules.

## User Setup Required

The `prisma db push` step requires Neon credentials. The `.env.local` file was created with placeholder values. Before running `npm run db:push`:

1. Create a Neon project named 'melios' at https://console.neon.tech
2. Create a database named 'melios'
3. Copy the **pooled** connection string to `DATABASE_URL` in `.env.local`
4. Copy the **direct (non-pooled)** connection string to `DIRECT_URL` in `.env.local`
5. Run: `npm run db:push`
6. Verify: `npm run db:studio` opens and shows all 12 tables

## Next Phase Readiness
- Schema and db.ts are complete — 01-03 (Better Auth) can import `db` from `@/lib/db` immediately
- `npm run db:push` will create all 12 tables once Neon credentials are added to `.env.local`
- `npx prisma studio` will show all tables after push completes

---
*Phase: 01-project-foundation-auth*
*Completed: 2026-03-06*
