---
phase: 01-project-foundation-auth
plan: "04"
subsystem: infra
tags: [vercel, github-actions, ci-cd, nextjs, prisma]

# Dependency graph
requires:
  - phase: 01-03
    provides: Working Next.js + Better Auth app ready for production deployment
provides:
  - GitHub Actions CI pipeline running lint + typecheck + build on every PR
  - Vercel production deployment at https://meli-os.vercel.app/
  - Auto-deploy on push to main via Vercel GitHub integration
  - Preview deployments on every PR via Vercel
  - postinstall prisma generate for Vercel build compatibility
affects:
  - 02-meli-oauth
  - all future phases (CI/CD is now the deployment pipeline)

# Tech tracking
tech-stack:
  added: [github-actions, vercel]
  patterns: [ci-on-pr, auto-deploy-on-main, preview-deployments]

key-files:
  created:
    - .github/workflows/ci.yml
    - vercel.json
  modified:
    - package.json (postinstall prisma generate)

key-decisions:
  - "Vercel region gru1 (São Paulo) chosen — closest to Argentina, reduces latency for target market"
  - "postinstall script added to run prisma generate so Vercel build doesn't fail (Prisma 7 requires explicit generate step)"
  - "callbackURL passed to signUp so post-verification redirect goes to /dashboard (not /) — discovered and fixed during production testing"
  - "Production URL: https://meli-os.vercel.app/"

patterns-established:
  - "CI on PR: GitHub Actions runs lint + typecheck + build before Vercel deploys"
  - "Env vars pattern: all 7 required vars (DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, NEXT_PUBLIC_APP_URL) set in Vercel dashboard for production and preview"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]

# Metrics
duration: ~45min (including human deployment steps)
completed: 2026-03-06
---

# Phase 1 Plan 04: CI/CD and Vercel Deployment Summary

**GitHub Actions CI pipeline and Vercel production deployment — full auth flow (register, verify email, login, logout) confirmed working at https://meli-os.vercel.app/**

## Performance

- **Duration:** ~45 min (including human deployment steps)
- **Started:** 2026-03-06
- **Completed:** 2026-03-06
- **Tasks:** 2 (1 auto + 1 human-action checkpoint)
- **Files modified:** 3

## Accomplishments

- GitHub Actions CI pipeline created — runs ESLint, TypeScript typecheck, and Next.js build on every push and PR to main
- Vercel production deployment live at https://meli-os.vercel.app/ with auto-deploy on every push to main
- Full auth flow verified on production: register → email verification → dashboard → logout → login
- Fixed Vercel build failure caused by missing `prisma generate` step (Prisma 7 requires explicit generate; added as postinstall script)
- Fixed post-verification redirect: added `callbackURL: '/dashboard'` to signUp call so verified users land on dashboard instead of homepage

## Task Commits

1. **Task 1: GitHub Actions CI pipeline and Vercel config** - `d1468b9` (chore)
2. **Fix: postinstall prisma generate for Vercel builds** - `1bb8997` (fix)
3. **Fix: callbackURL to signUp for redirect** - `3df986c` (fix)
4. **Task 2: Deploy to Vercel** - human-action (verified by user)

## Files Created/Modified

- `.github/workflows/ci.yml` — CI pipeline: lint + typecheck + build on push/PR to main
- `vercel.json` — Vercel project config: framework nextjs, gru1 region, 30s function timeout
- `package.json` — Added postinstall script: `prisma generate` (required for Vercel build with Prisma 7)

## Decisions Made

- **Vercel region gru1 (São Paulo):** Closest Vercel region to Argentina — directly reduces API latency for the target market
- **postinstall prisma generate:** Prisma 7 no longer auto-generates the client during `npm install`; Vercel's build environment requires this to be explicit
- **callbackURL fix:** Better Auth requires `callbackURL` passed at signUp time for email verification redirect to work; defaulting to `/` was silently overriding the intended `/dashboard` redirect

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] postinstall prisma generate missing for Vercel builds**
- **Found during:** Task 2 (Deploy to Vercel — human-action)
- **Issue:** Vercel build failed because Prisma 7 client wasn't generated; Vercel's build environment doesn't run `prisma generate` automatically and the generated client isn't committed to git
- **Fix:** Added `"postinstall": "prisma generate"` to `package.json` scripts so Vercel runs it automatically after `npm ci`
- **Files modified:** `package.json`
- **Verification:** Subsequent Vercel deploy succeeded and app served correctly
- **Committed in:** `1bb8997`

**2. [Rule 1 - Bug] callbackURL not passed to signUp, causing broken post-verification redirect**
- **Found during:** Task 2 (production auth flow verification)
- **Issue:** After email verification, users were redirected to `/` instead of `/dashboard` — Better Auth requires `callbackURL` passed explicitly at signUp time, not just in config
- **Fix:** Added `callbackURL: '/dashboard'` to the `signUp.email` call in the auth client
- **Files modified:** `src/app/(auth)/register/page.tsx` (or equivalent sign-up form)
- **Verification:** Verified on production — email verification link now redirects to `/dashboard`
- **Committed in:** `3df986c`

---

**Total deviations:** 2 auto-fixed (1 blocking build failure, 1 bug in auth redirect)
**Impact on plan:** Both fixes were necessary for production correctness. No scope creep.

## Issues Encountered

- Vercel build failed on first deploy due to Prisma 7's explicit generate requirement — resolved with postinstall script
- Email verification redirect was silently going to `/` in production — discovered during manual verification and fixed

## User Setup Required

The following were configured manually by the user in Vercel dashboard:
- 7 environment variables set in Vercel for production and preview: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`
- Vercel GitHub integration connected to repository for auto-deploy on push to main
- GitHub Actions secrets added for CI pipeline builds

## Next Phase Readiness

- Phase 1 is complete — all 4 plans shipped
- Production infrastructure is live and stable at https://meli-os.vercel.app/
- CI/CD pipeline will gate all future PRs automatically
- Phase 2 can begin: MELI OAuth integration requires APP_ID + SECRET_KEY from developers.mercadolibre.com.ar — user must register app before Phase 2 work starts

---
*Phase: 01-project-foundation-auth*
*Completed: 2026-03-06*
