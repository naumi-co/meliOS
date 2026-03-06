# MeliOps

## What This Is

MeliOps is a B2B SaaS platform that acts as the operating system for serious MercadoLibre sellers. It gives sellers visibility into their real net margin per listing, automates competitive intelligence, and runs dynamic repricing 24/7 — filling the gap that tools like Helium 10 fill for Amazon sellers, but for the MELI ecosystem.

Target customer: sellers with 50+ active SKUs, own stock, USD 3k+/month in sales, operating in Argentina (first), then Mexico and Brazil.

## Core Value

A seller must be able to connect their MELI account and immediately see which of their listings are losing money — before they spend a single minute configuring anything else.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**v1.0 — La Radiografia (F1)**

- [ ] Seller can register and connect their MercadoLibre account via OAuth 2.0 in under 2 minutes
- [ ] All active listings are imported with price, category, shipping config, and listing type
- [ ] Sales history (last 90 days) is imported and linked to listings
- [ ] Net margin is calculated per listing: price - MELI commission - shipping cost - installment cost - product cost
- [ ] Seller can enter product cost manually (inline) or via CSV upload
- [ ] Dashboard shows all listings with a traffic-light margin indicator (green >15%, yellow 5-15%, red <5%)
- [ ] 4 KPI summary cards: total revenue, active listings, red listings, average margin
- [ ] Background sync runs every 15 minutes (prices, stock, new sales) via Inngest
- [ ] Email alert fires when a listing crosses into negative margin (max 1/listing/day)
- [ ] Dashboard loads in under 3 seconds for a seller with 200 SKUs

### Out of Scope

- Competitor monitoring (F2) — deferred to v2.0
- Automatic repricing (F3) — deferred to v3.0; requires write OAuth scope not requested in F1
- Ads management (F4) — deferred to v4.0
- Inventory management + electronic invoicing (F5) — deferred to v5.0
- Mexico and Brazil country support — Argentina only for v1.0; multi-country architecture planned from day 1 but not surfaced in UI yet
- Product variations (size/color variants) — treated as single item with base price in v1.0; improve in later iterations

## Context

### Team
- 3 people: 2 developers (one senior, leads architecture) + 1 domain expert (active large MELI seller, will validate product decisions and may contribute code)
- The seller expert is critical for validating margin calculation accuracy against what MELI's own seller panel shows

### MercadoLibre API
- OAuth 2.0 with scopes: `read`, `offline_access` (refresh token). Scope `write` needed only from F3 onwards.
- `access_token` TTL: 6 hours. `refresh_token` TTL: 6 months. Background job must refresh before expiry.
- Rate limit: 600 requests/minute per token. Background sync must respect this with queuing and backoff.
- Key endpoints for F1:
  - `GET /users/me` — authenticated user data
  - `GET /users/{user_id}/items/search` — list active listings (paginated)
  - `GET /items/{item_id}` — listing detail
  - `GET /orders/search?seller={id}&order.status=paid` — sales history
  - `GET /categories/{category_id}/fees` — commission rates by category
  - `GET /items/{item_id}/shipping_options` — shipping cost options
- Test accounts available at developers.mercadolibre.com.ar — use these during development
- MELI app must be registered to get APP_ID and SECRET_KEY before any OAuth work begins
- OAuth URLs vary by country: `.com.ar` for Argentina, `.com.mx` for Mexico, `.com.br` for Brazil — design with this in mind from day 1

### Margin Calculation Formula
```
net_margin = sale_price - meli_commission - shipping_cost - installment_cost - product_cost
margin_pct = net_margin / sale_price * 100
```
- `meli_commission`: from `GET /categories/{category_id}/fees` — varies by category and listing type (Classic ~13.5%, Premium ~16.5%)
- `shipping_cost`: 0 if MELI subsidizes (Fulfillment Full), real cost if seller subsidizes free shipping, 0 if buyer pays
- `installment_cost`: MELI charges sellers for offering interest-free installments — often underestimated
- `product_cost`: only seller-provided data point; not available from API

### Product Decisions
- Traffic-light thresholds: green >15%, yellow 5-15%, red <5% (including loss)
- Recalculate margin when: price changes (detected at sync), seller updates product cost, or MELI commissions change
- Sync frequency: 15 minutes (prices + stock + new sales). Show "last updated X minutes ago" in dashboard.
- Alert rate limiting: max 1 email per listing per day to avoid spam

## Constraints

- **Tech Stack**: Next.js 15 (App Router, TypeScript), Better Auth, Neon (serverless Postgres), Prisma ORM, Inngest (background jobs), Resend (email), Vercel (deployment) — chosen for minimal ops overhead and team familiarity
- **Deployment**: Vercel — functions have 60s timeout limit; all long-running work must go through Inngest
- **Multi-tenant from day 1**: All DB rows scoped by `account_id`. F5 makes this critical — don't cut corners here.
- **Security**: MELI OAuth tokens must be encrypted at rest, never exposed to frontend. Use server-side API routes only for token operations.
- **Country**: Argentina only for v1.0, but OAuth and API URL patterns must be parameterized for future country support
- **Monorepo**: Single Next.js app. Split into separate services only if scale demands it.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 15 (full-stack) over separate frontend + NestJS backend | Simplest monorepo setup for small team; API routes handle all backend needs for F1 | — Pending |
| Better Auth over Clerk | Self-hosted, data stays in our Neon DB, no per-MAU cost, Prisma adapter is first-class | — Pending |
| Inngest over BullMQ/Redis | Vercel-native serverless jobs, no Redis to manage, free tier covers MVP scale | — Pending |
| Resend over SendGrid | Simpler API, better DX, generous free tier | — Pending |
| Neon (serverless Postgres) over Supabase | Vercel integration, pay-per-use, keeps auth in Better Auth not Supabase | — Pending |
| Argentina-first launch | Team domain expert is an AR seller; simplest OAuth URL and tax logic to start | — Pending |
| Product cost is manual input only | Not available from MELI API; CSV import added for bulk sellers | — Pending |
| price_snapshots table added in F1 schema | F2 (Radar) needs historical price data; starting collection early costs nothing and saves a painful migration | — Pending |

---
*Last updated: 2026-03-06 — initial PROJECT.md from pre-development planning conversations*
