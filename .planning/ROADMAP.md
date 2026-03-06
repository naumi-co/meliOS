# Roadmap: MeliOps

## Overview

MeliOps is built in 5 product phases (mapped to 5 milestones), each delivering independent value while laying the foundation for the next. v1.0 ships the core margin visibility dashboard. Subsequent milestones add competitor intelligence, automated repricing, ads/returns/P&L, and finally full inventory + invoicing. Active development begins with v1.0 (La Radiografia).

## Milestones

- 🚧 **v1.0 — La Radiografia** — Phases 1–4 (in progress)
- 📋 **v2.0 — El Radar** — Phases 5–8 (planned)
- 📋 **v3.0 — El Piloto Automatico** — Phases 9–14 (planned)
- 📋 **v4.0 — El Cerebro** — Phases 15–20 (planned)
- 📋 **v5.0 — Sistema Unico** — Phases 21–27 (planned)

---

## 🚧 v1.0 — La Radiografia (Active)

**Milestone Goal:** A seller connects their MELI account and immediately sees real net margin per listing — which ones are profitable, which ones are losing money — without any prior configuration beyond entering product costs.

### Phase 1: Project Foundation + Auth
**Goal**: Working Next.js app on Vercel with Better Auth (email/password), Neon DB with Prisma schema, and CI/CD pipeline.
**Depends on**: Nothing
**Requirements**: Project setup, authentication, database
**Success Criteria** (what must be TRUE):
  1. User can register with email/password and receive a confirmation email
  2. User can log in and access a protected dashboard route
  3. Prisma schema is deployed to Neon with correct multi-tenant `account_id` scoping
  4. Every push to main deploys automatically to Vercel

Plans:
- [x] 01-01: Next.js 15 monorepo setup with TypeScript, Tailwind, ESLint, Prettier
- [ ] 01-02: Neon Postgres + Prisma schema (users, accounts, items, orders, price_snapshots, margin_results, product_costs, alerts)
- [ ] 01-03: Better Auth integration — email/password registration, email verification, login, session management
- [ ] 01-04: Vercel deployment + environment variables config + preview deployments per PR

### Phase 2: MercadoLibre OAuth + Data Import
**Goal**: Seller can connect their MELI account via OAuth and trigger an import of all active listings and 90-day sales history.
**Depends on**: Phase 1
**Requirements**: MELI OAuth 2.0, listings import, sales import
**Success Criteria** (what must be TRUE):
  1. Seller clicks "Connect MercadoLibre" and completes OAuth in under 2 minutes
  2. All active listings are stored in DB with price, category_id, listing_type, shipping config, thumbnail
  3. Last 90 days of paid orders are stored and linked to listings
  4. access_token refresh job runs before token expiry (6-hour TTL)
  5. Import runs in background (Inngest) and handles catalogs of 500+ SKUs without timeout

Plans:
- [ ] 02-01: MELI OAuth 2.0 flow — authorization redirect, callback handler, token exchange, encrypted token storage
- [ ] 02-02: Inngest setup + listings import job (paginated GET /users/{id}/items/search + GET /items/{id} per listing)
- [ ] 02-03: Sales history import job (GET /orders/search, last 90 days, paginated, linked to listings)
- [ ] 02-04: Token refresh background job + MELI API client with rate limiting (600 req/min) and exponential backoff

### Phase 3: Margin Engine
**Goal**: Net margin is calculated for every listing using MELI commissions, shipping cost, installment cost, and seller-provided product cost. Seller can enter costs manually or via CSV.
**Depends on**: Phase 2
**Requirements**: Commission calculator, shipping calculator, product cost input, margin formula
**Success Criteria** (what must be TRUE):
  1. Margin is calculated for every imported listing using the formula: price - commission - shipping - installments - product_cost
  2. Commission values match MELI seller panel within ±2% tolerance
  3. Seller can enter product cost inline (auto-save on blur) for each listing
  4. Seller can upload a CSV (sku,cost) and see a preview before confirming
  5. Margin recalculates immediately when product cost is updated

Plans:
- [ ] 03-01: Commission calculator — GET /categories/{id}/fees per listing, store and cache by category+listing_type
- [ ] 03-02: Shipping cost calculator — parse shipping config (free/subsidized by MELI vs seller vs buyer), use representative zip code for reference cost
- [ ] 03-03: Product cost input UI — inline editable table field with auto-save + CSV upload with validation and preview
- [ ] 03-04: Margin calculation engine — core calcularMargen() function, MarginResult interface, traffic-light logic (green >15%, yellow 5-15%, red <5%), triggered on cost update or sync

### Phase 4: Dashboard + Sync + Alerts
**Goal**: Main dashboard showing all listings with margin semaforo, KPI summary cards, 15-minute auto-sync, and email alerts for listings that go negative.
**Depends on**: Phase 3
**Requirements**: Dashboard UI, KPI cards, periodic sync, alerts
**Success Criteria** (what must be TRUE):
  1. Dashboard shows all listings with all margin columns, sortable and filterable by traffic-light status
  2. Dashboard loads in under 3 seconds for a seller with 200 SKUs
  3. KPI cards show: total revenue (last 30d), active listings count, red listings count, weighted average margin
  4. Prices, stock, and new sales refresh every 15 minutes via Inngest without manual intervention
  5. Email alert fires within 15 minutes of a listing crossing into negative margin (max 1 per listing per day)
  6. "Last updated X minutes ago" indicator visible in dashboard

Plans:
- [ ] 04-01: Dashboard table UI — columns: thumbnail, title, price, commission, shipping, product cost, net margin ($), margin (%), semaforo; sort, filter by color, search by name, pagination (50/page)
- [ ] 04-02: KPI summary cards — 4 cards in dashboard header, computed from DB
- [ ] 04-03: Inngest periodic sync job — every 15 min: refresh prices + stock, import new sales, recalculate margins, trigger alerts
- [ ] 04-04: Email alerts via Resend — in-app notification badge + email template for negative margin, rate-limited 1/listing/day

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation + Auth | 2/4 | In Progress|  |
| 2. MercadoLibre OAuth + Data Import | 0/4 | Not started | - |
| 3. Margin Engine | 0/4 | Not started | - |
| 4. Dashboard + Sync + Alerts | 0/4 | Not started | - |

---

## 📋 v2.0 — El Radar (Planned)

**Milestone Goal:** Automated competitive intelligence — every listing shows who the competitors are, what they're charging, and whether they have stock. Alerts fire when a competitor runs out of stock (price increase opportunity) or undercuts on price.

High-level phases (to be detailed before v2.0 kicks off):
- Phase 5: Competitor identification per catalog listing
- Phase 6: Price + stock monitor (15-min snapshots, historical data)
- Phase 7: Configurable alert system (out of stock, price drop, new competitor, lost Buy Box)
- Phase 8: Opportunity detector + centralized alerts dashboard

**Note**: price_snapshots table is created in v1.0 Phase 1 schema to begin accumulating data early.

---

## 📋 v3.0 — El Piloto Automatico (Planned)

**Milestone Goal:** Prices adjust automatically 24/7. When a competitor runs out of stock at 2am, MeliOps raises the price without anyone watching. Requires OAuth `write` scope (re-authorization flow needed).

High-level phases:
- Phase 9: Repricing engine — 3 strategies (aggressive / balanced / conservative), invariants (min price, max price)
- Phase 10: Buy Box detection + price change execution via PUT /items/{id}
- Phase 11: Repricing log + dry-run mode + pause/resume controls
- Phase 12: Stock forecasting — velocity calculation, days-of-stock estimate, reorder alerts
- Phase 13: Forecasting dashboard + seasonal event calendar (Hot Sale, Cyber Monday, etc.)
- Phase 14: Reauthorization flow for write scope + billing gate (Pro plan required)

---

## 📋 v4.0 — El Cerebro (Planned)

**Milestone Goal:** Full optimization suite — Mercado Ads management (ROAS tracking + auto-optimization), returns analysis with AI pattern detection, product launch wizard, and unified P&L financial reporting.

High-level modules (each maps to 1-2 phases):
- Phase 15-16: P&L financiero — Mercado Pago movements import, monthly P&L, per-SKU drill-down, accounting export
- Phase 17-18: Mercado Ads optimizer — campaign stats, ROAS dashboard, automated bid optimization
- Phase 19: Returns analyzer — claims import, AI classification (Claude), pattern detection and recommendations
- Phase 20: Launch wizard — optimal launch price, Ads budget calculator, keyword suggestions, pre-publish checklist

**Note**: F4-D2 (returns classifier) will use Claude API for LLM classification in batch mode.

---

## 📋 v5.0 — Sistema Unico (Planned)

**Milestone Goal:** MeliOps becomes the single operating system for the seller's entire business — inventory management, electronic invoicing (AFIP Argentina + SAT Mexico), multi-account portal for agencies, and a public REST API for ERP integrations.

High-level modules:
- Phase 21-22: Inventory module — product catalog, stock sync MELI <> system (bidirectional), multi-warehouse, purchase orders
- Phase 23-24: Electronic invoicing Argentina (AFIP/WSFE) + Mexico (SAT/CFDI 4.0 via PAC)
- Phase 25-26: Multi-account portal + roles/permissions (Admin, Operator, Accountant, Viewer)
- Phase 27: Public REST API + webhooks for ERP integrations

**Critical**: Invoicing module must be validated by a certified accountant in each country before launch. AFIP and SAT regulations change — design as a swappable plugin.
