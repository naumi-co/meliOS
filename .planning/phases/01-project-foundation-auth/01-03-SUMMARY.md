---
phase: 01-project-foundation-auth
plan: 03
subsystem: auth
tags: [better-auth, resend, prisma, email-verification, middleware, nextjs]

# Dependency graph
requires:
  - phase: 01-project-foundation-auth/01-02
    provides: Prisma 7 schema with all models + db.ts singleton via Neon adapter
provides:
  - Better Auth server instance with Prisma adapter and email verification plugin
  - Email/password registration with business name and country fields
  - Resend email sender for transactional verification emails
  - Route protection middleware (Edge) blocking unauthenticated access
  - Login/logout flow with 30-day session persistence
  - Protected /dashboard stub with server-side session guard
affects:
  - 01-04
  - 02-mercadolibre-oauth
  - All future phases requiring authenticated user context

# Tech tracking
tech-stack:
  added:
    - better-auth (^1.x) — auth framework with Prisma adapter
    - resend — transactional email SDK
    - "@better-fetch/fetch" — Edge-compatible fetch (better-auth dependency)
  patterns:
    - Better Auth catch-all API route via toNextJsHandler
    - Edge middleware session check via betterFetch to /api/auth/get-session
    - Server component session reads via auth.api.getSession({ headers: await headers() })
    - Client components use authClient from src/lib/auth-client.ts
    - DashboardLayout does server-side session guard as secondary defense

key-files:
  created:
    - src/lib/auth.ts
    - src/lib/auth-client.ts
    - src/lib/email.ts
    - src/app/api/auth/[...all]/route.ts
    - src/app/(auth)/register/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/verify-email/page.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/app/(dashboard)/layout.tsx
    - src/middleware.ts
    - src/components/LogoutButton.tsx
  modified:
    - prisma/schema.prisma
    - package.json

key-decisions:
  - "AuthAccount model renamed to Account — Better Auth requires a model named 'account' (lowercase) for its Prisma adapter; the existing business Account model had to be renamed SellerAccount to avoid collision"
  - "callbackURL: '/dashboard' added to emailVerification config — required for auto-redirect after email verification click; otherwise Better Auth redirects to / which has no handler"
  - "Register form converted to controlled React inputs — uncontrolled FormData approach caused intermittent empty fields in some browser/password-manager combinations"
  - "RESEND_FROM_EMAIL set to onboarding@resend.dev for local dev — no custom domain needed for testing; Resend allows this sender for sandbox mode"
  - "autoSignInAfterVerification: true — user is automatically signed in and redirected after clicking verification link, removing need for a second login step"

patterns-established:
  - "Pattern: Edge middleware as first auth gate — betterFetch to /api/auth/get-session at the Edge, before any React rendering"
  - "Pattern: Server component layout as second auth gate — DashboardLayout uses auth.api.getSession for server-side redirect guard"
  - "Pattern: Client auth via authClient singleton — all client components import from src/lib/auth-client.ts"
  - "Pattern: Controlled form inputs in auth forms — avoids uncontrolled input issues with password managers and autoComplete"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: ~90min (including human verification and debugging)
completed: 2026-03-06
---

# Phase 1 Plan 03: Better Auth Email/Password Authentication Summary

**Better Auth + Resend delivering register → verify email → auto-login → protected dashboard → logout with Edge middleware and 30-day session persistence**

## Performance

- **Duration:** ~90 min (including human verification and post-checkpoint debugging)
- **Started:** 2026-03-06T02:00:00Z (estimated)
- **Completed:** 2026-03-06T04:28:26Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 14

## Accomplishments

- Complete email/password auth flow: register -> verification email (Resend) -> auto-sign-in -> /dashboard -> logout -> re-login
- Edge middleware protects all non-public routes before React renders; server-component layout adds secondary guard
- Business-specific fields (businessName, country) wired through Better Auth additionalFields into the User model
- Session persists 30 days via httpOnly cookie; cookie cache prevents redundant session fetches
- Prisma model naming conflict resolved: Better Auth's expected `account` table now maps to the renamed `Account` model (previously `AuthAccount`), and the business `Account` model renamed to `SellerAccount`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Better Auth, configure auth instance, and create Resend email sender** - `ced525a` (feat)
2. **Task 2: Build register/login/verify pages, dashboard stub, and auth middleware** - `1f9b7ae` (feat)
3. **Task 3 (post-checkpoint fixes): Resolve Better Auth DB collision and form issues** - `a4df1a2` (fix)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/lib/auth.ts` - Better Auth server instance with Prisma adapter, email verification, session config, additionalFields
- `src/lib/auth-client.ts` - Better Auth browser client; exports signIn, signUp, signOut, useSession
- `src/lib/email.ts` - Resend email sender for verification emails (Spanish copy)
- `src/app/api/auth/[...all]/route.ts` - Better Auth catch-all API route via toNextJsHandler
- `src/app/(auth)/register/page.tsx` - Registration form with businessName, email, password, country (controlled inputs)
- `src/app/(auth)/login/page.tsx` - Login form with error display and /dashboard redirect
- `src/app/(auth)/verify-email/page.tsx` - Verification status page (sent/error states)
- `src/app/(dashboard)/dashboard/page.tsx` - Protected dashboard stub showing user's business name
- `src/app/(dashboard)/layout.tsx` - Server component session guard for dashboard group
- `src/middleware.ts` - Edge middleware: allows public routes + /api/auth/*, blocks rest without session
- `src/components/LogoutButton.tsx` - Client component calling signOut and redirecting to /login
- `prisma/schema.prisma` - Renamed AuthAccount -> Account, Account -> SellerAccount; updated all relations

## Decisions Made

- **AuthAccount -> Account rename:** Better Auth's Prisma adapter requires a model named `account` (maps to its OAuth accounts table). Renamed the project's existing `AuthAccount` model to `Account` to satisfy this requirement, and renamed the business `Account` model to `SellerAccount` throughout.
- **callbackURL: "/dashboard":** Without this, Better Auth's email verification redirect defaults to "/" — added explicit callback to land verified users on the dashboard.
- **Controlled form inputs:** Switched register form from uncontrolled (FormData) to controlled React state. FormData read was returning empty strings intermittently with password manager autofill; controlled inputs are more reliable.
- **RESEND_FROM_EMAIL = onboarding@resend.dev:** Resend sandbox sender for local development — no domain verification needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma model naming collision with Better Auth**
- **Found during:** Task 3 / post-checkpoint verification
- **Issue:** Better Auth Prisma adapter expects a model named `account` for OAuth provider accounts. The schema had `AuthAccount` for this and `Account` for the business entity. Better Auth couldn't map to `AuthAccount` and threw errors when trying to create/read auth accounts.
- **Fix:** Renamed `AuthAccount` -> `Account` (Better Auth's expected name), renamed business `Account` -> `SellerAccount`, updated all Prisma relations throughout the schema, ran `npx prisma db push` to apply.
- **Files modified:** prisma/schema.prisma
- **Verification:** Auth flow completed end-to-end without DB errors; human-verified working
- **Committed in:** a4df1a2

**2. [Rule 1 - Bug] Added callbackURL to emailVerification config**
- **Found during:** Task 3 / post-checkpoint verification
- **Issue:** After clicking the verification link, users were redirected to "/" (no page) instead of "/dashboard". Better Auth defaults to "/" when callbackURL is absent.
- **Fix:** Added `callbackURL: "/dashboard"` to the `emailVerification` config in auth.ts.
- **Files modified:** src/lib/auth.ts
- **Verification:** Clicking verification link now redirects to /dashboard with active session
- **Committed in:** a4df1a2

**3. [Rule 1 - Bug] Converted register form to controlled inputs**
- **Found during:** Task 3 / post-checkpoint verification
- **Issue:** Registration was failing because FormData was reading empty strings for fields autofilled by password manager. businessName and other fields were empty on submit.
- **Fix:** Replaced uncontrolled `FormData` approach with React controlled state (`useState`) for all register form fields. Added `autoComplete` attributes to assist browser/password-manager recognition.
- **Files modified:** src/app/(auth)/register/page.tsx
- **Verification:** Registration with password manager autofill now works; businessName correctly passed to Better Auth
- **Committed in:** a4df1a2

**4. [Rule 3 - Blocking] Regenerated Prisma client after schema changes**
- **Found during:** Task 3 / post-checkpoint verification
- **Issue:** Prisma client didn't include `businessName` field on User model because it was generated before the field was added to the schema.
- **Fix:** Ran `npx prisma generate` to regenerate the client with the updated schema.
- **Files modified:** Generated Prisma client (internal, not tracked)
- **Verification:** TypeScript no longer complained about missing `businessName`; registration correctly persisted the field
- **Committed in:** a4df1a2 (schema changes that triggered this)

---

**Total deviations:** 4 auto-fixed (3 bugs, 1 blocking)
**Impact on plan:** All auto-fixes were necessary for the auth flow to function. The Prisma model naming conflict was the most significant — a structural requirement of Better Auth's adapter that wasn't documented in the plan. No scope creep.

## Issues Encountered

- Better Auth's Prisma adapter documentation on model naming is sparse — discovered the `account` model naming requirement by testing and reading Better Auth source. Fixed by renaming models.
- Resend requires `RESEND_FROM_EMAIL=onboarding@resend.dev` for local testing without a verified domain — plan mentioned this as an option but RESEND_FROM_EMAIL needed to be set explicitly (not defaulted from code) for the env var to take effect.

## User Setup Required

External services configured during this plan:

- **Resend:** `RESEND_API_KEY` added to `.env.local`. Using `onboarding@resend.dev` as sender for local dev (no domain verification required).
- **Better Auth:** `BETTER_AUTH_SECRET` (32-byte hex) and `BETTER_AUTH_URL=http://localhost:3000` added to `.env.local`.

## Next Phase Readiness

- Auth foundation complete — register, verify, login, logout, session persistence all working end-to-end
- Dashboard stub at /dashboard ready to be replaced with real UI in Phase 4
- Middleware and server-component guards are in place for all future protected routes
- SellerAccount model in Prisma schema is ready for Phase 2 (MercadoLibre OAuth connection stored against SellerAccount)
- Blocker: MELI app registration (APP_ID + SECRET_KEY) still needed before Phase 2 OAuth work can start

---
*Phase: 01-project-foundation-auth*
*Completed: 2026-03-06*
