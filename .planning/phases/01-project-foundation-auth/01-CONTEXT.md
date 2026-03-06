# Phase 1: Project Foundation + Auth — Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** PRD Express Path (PRD_F1_Radiografia.md + pre-development planning conversation)

<domain>
## Phase Boundary

This phase delivers a working, deployed Next.js application with user authentication (email/password), a Postgres database with the full multi-tenant schema, and a CI/CD pipeline to Vercel. No MELI API integration yet — that is Phase 2. The output of this phase is: a logged-in user can reach a protected dashboard route and nothing more.

</domain>

<decisions>
## Implementation Decisions

### Framework
- Next.js 15 with App Router and TypeScript — full-stack monorepo (frontend + API routes in one app)
- No separate backend service (no NestJS, no Express) for v1
- Tailwind CSS for styling

### Authentication
- **Better Auth** (not Clerk, not Auth.js/NextAuth) — self-hosted, Prisma adapter is first-class, no per-MAU cost, user data stays in our DB
- Email/password registration only for v1 (no Google/GitHub OAuth)
- Email verification required before accessing the app
- Session persists across browser refresh

### Database
- **Neon** (serverless Postgres) — integrates natively with Vercel, pay-per-use, no server to manage
- **Prisma ORM** — easiest DX for the team, type-safe queries, Neon adapter available
- Multi-tenant from day 1: every table has `account_id` FK — this is a hard requirement, not optional
- Schema must include `price_snapshots` table in Phase 1 even though it's used in Phase 2 (El Radar), to begin accumulating data early and avoid migration pain later

### Email
- **Resend** for transactional email (email verification, future alerts)
- Better than SendGrid for new projects: simpler API, generous free tier, great Next.js SDK

### Deployment
- **Vercel** — zero config, automatic preview deployments per PR
- All secrets (DB URL, Better Auth secret, Resend API key) stored as Vercel environment variables
- Production + preview environments from day 1

### Monorepo Structure
- Single Next.js app, no Turborepo needed at this stage
- `/app` — Next.js App Router pages and layouts
- `/app/api` — API routes (auth callbacks, etc.)
- `/lib` — shared utilities, DB client, auth config
- `/components` — shared UI components
- `/prisma` — schema.prisma + migrations

### Schema Design (full v1 schema, designed for F1-F5)
All tables must have:
- `id` (cuid or uuid)
- `created_at`, `updated_at`
- `account_id` FK (multi-tenant isolation)

Tables needed for Phase 1 (and forward-compatible with all phases):
- `users` — Better Auth managed (email, password hash, verified)
- `sessions` — Better Auth managed
- `accounts` — MeliOS accounts (one per registered business; maps to one MELI seller)
- `meli_connections` — MELI OAuth tokens per account (encrypted access_token, refresh_token, expires_at, seller_id, country)
- `items` — MELI listings (item_id, title, price, category_id, listing_type, shipping config, thumbnail, permalink)
- `orders` — MELI sales (order_id, item_id, quantity, unit_price, date_created)
- `product_costs` — seller-provided cost per item (item_id, cost, updated_at)
- `margin_results` — computed margins (item_id, commission, shipping_cost, installment_cost, net_margin, margin_pct, semaforo)
- `price_snapshots` — price+stock history per item (item_id, seller_id, price, available_quantity, timestamp) — needed for Phase 2 (El Radar)
- `alerts` — fired alerts log (type, item_id, message, sent_at, read_at)

### What Claude Decides (not specified in PRD)
- Exact Prisma schema field types and indexes — use appropriate types, add indexes on frequently queried fields (`account_id`, `item_id`, `timestamp`)
- Better Auth session configuration details (session TTL, cookie settings)
- Resend email template for verification (keep simple: text with link)
- ESLint/Prettier configuration specifics
- Whether to use Prisma Accelerate or direct Neon connection string — use direct connection for simplicity in v1
- Folder structure within `/app` for protected vs public routes — use Next.js route groups: `(auth)` for login/register, `(dashboard)` for protected routes

</decisions>

<specifics>
## Specific Requirements from PRD

**Registration fields:** email, password, nombre del negocio (business name), país (country: AR / MX / BR — store for future tax logic, default AR for v1)

**OAuth scopes for MELI (Phase 2):** `read`, `offline_access` — design schema to support this now even though connection happens in Phase 2

**MELI test accounts:** Developers should use MELI sandbox accounts during development — not relevant for Phase 1 but flag it in setup docs/README

**Countries supported in v1:** Argentina only, but `country` field must be in schema from day 1 (`.com.ar` OAuth URLs; `.com.mx`, `.com.br` for later)

**Token security:** MELI OAuth tokens must be encrypted at rest — `meli_connections.access_token` and `refresh_token` should be encrypted before storing (Phase 2 concern but schema must support it)

</specifics>

<deferred>
## Deferred to Later Phases

- MELI OAuth connection — Phase 2
- Listings and sales import — Phase 2
- Margin calculation — Phase 3
- Dashboard UI — Phase 4
- Background sync (Inngest) — Phase 4
- Email alerts — Phase 4
- Mexico / Brazil country support — post-v1
- Social login (Google, GitHub) — out of scope for v1

</deferred>

---

*Phase: 01-project-foundation-auth*
*Context gathered: 2026-03-06 via PRD Express Path*
