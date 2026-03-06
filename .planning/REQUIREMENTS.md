# Requirements: MeliOps

**Defined:** 2026-03-06
**Core Value:** A seller connects their MELI account and immediately sees which listings are losing money — before spending a single minute configuring anything else.

## v1 Requirements (Milestone: La Radiografia)

### Authentication

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: User receives email verification link after signup and must confirm before accessing the app
- [ ] **AUTH-03**: User can log in and session persists across browser refresh
- [ ] **AUTH-04**: User can log out from any page

### MercadoLibre Connection

- [ ] **MELI-01**: User can connect their MercadoLibre account via OAuth 2.0 (Argentina) in under 2 minutes
- [ ] **MELI-02**: OAuth access_token is stored encrypted; refresh_token is used to renew it before the 6-hour TTL expires
- [ ] **MELI-03**: User can disconnect their MELI account and revoke access
- [ ] **MELI-04**: MELI API client respects the 600 req/min rate limit with queuing and exponential backoff

### Listings Import

- [ ] **LIST-01**: All active listings are imported with: title, price, category_id, listing_type, shipping config, thumbnail, permalink
- [ ] **LIST-02**: Import runs as a background job (Inngest) and handles catalogs of 500+ SKUs without Vercel function timeout
- [ ] **LIST-03**: Listings import shows progress feedback to the user during the first sync

### Sales Import

- [ ] **SALE-01**: Last 90 days of paid orders are imported and linked to their corresponding listings
- [ ] **SALE-02**: Per-listing metrics are calculated: units sold (30/60/90 days), average daily velocity, total revenue

### Margin Engine

- [ ] **MARG-01**: MELI commission is fetched per listing via GET /categories/{id}/fees and stored by category+listing_type
- [ ] **MARG-02**: Shipping cost is calculated: $0 if MELI subsidizes (Fulfillment Full), real cost if seller subsidizes free shipping, $0 if buyer pays
- [ ] **MARG-03**: Net margin is calculated using: price - commission - shipping - installment_cost - product_cost
- [ ] **MARG-04**: Commission values match MELI seller panel within ±2% tolerance
- [ ] **MARG-05**: Margin recalculates immediately when product cost is updated by the seller

### Product Cost Input

- [ ] **COST-01**: Seller can enter product cost inline per listing (auto-saves on blur, no submit button required)
- [ ] **COST-02**: Seller can upload a CSV (sku_meli, costo) with format validation and a 5-row preview before confirming
- [ ] **COST-03**: A downloadable CSV template is available for sellers to fill in

### Dashboard

- [ ] **DASH-01**: Dashboard table shows all listings with columns: thumbnail, title, price, commission ($), shipping ($), product cost ($), net margin ($), margin (%), traffic-light indicator
- [ ] **DASH-02**: Traffic-light indicator: green (>15%), yellow (5-15%), red (<5% including loss)
- [ ] **DASH-03**: Table supports sorting by any column, filtering by traffic-light color, and search by listing name
- [ ] **DASH-04**: Table is paginated at 50 listings per page
- [ ] **DASH-05**: Dashboard loads in under 3 seconds for a seller with 200 SKUs
- [ ] **DASH-06**: "Last updated X minutes ago" indicator is visible on the dashboard

### KPI Summary Cards

- [ ] **KPI-01**: 4 summary cards shown in dashboard header: total revenue (last 30 days), active listings count, red listings count, weighted average margin

### Background Sync

- [ ] **SYNC-01**: Inngest job runs every 15 minutes: refreshes prices + stock, imports new sales, recalculates margins if anything changed
- [ ] **SYNC-02**: Sync is isolated per user account — tokens from different users are never mixed

### Alerts

- [ ] **ALRT-01**: In-app notification badge shows count of unread alerts
- [ ] **ALRT-02**: Email alert fires when a listing crosses into negative margin; rate-limited to 1 email per listing per day
- [ ] **ALRT-03**: Email uses Resend with a clear subject and a link directly to the affected listing

## v2 Requirements (Milestone: El Radar — deferred)

### Competitor Intelligence
- **COMP-01**: Identify all competitors per catalog listing via catalog_product_id
- **COMP-02**: Monitor competitor price and stock every 15 minutes with historical snapshots
- **COMP-03**: Configurable alerts: competitor out of stock, price drop, new competitor, lost Buy Box
- **COMP-04**: Price history chart (7/30/90 days) per listing showing all competitors
- **COMP-05**: Opportunity detector — catalog listings where entering the market is attractive

## v3+ Requirements (Milestones: El Piloto, El Cerebro, Sistema Unico — deferred)

- Automatic repricing (requires OAuth write scope)
- Stock forecasting and reorder alerts
- Mercado Ads management
- P&L financial reporting
- Returns analysis with AI classification
- Product launch wizard
- Inventory management
- Electronic invoicing (AFIP Argentina, SAT Mexico)
- Multi-account portal and roles/permissions
- Public REST API for ERP integrations

## Out of Scope for v1

| Feature | Reason |
|---------|--------|
| Competitor monitoring | Deferred to v2 — significant additional complexity and data storage |
| Automatic repricing | Requires OAuth write scope; not requested in v1 |
| Mexico / Brazil support | Argentina only for v1; OAuth URL patterns parameterized but not surfaced in UI |
| Product variations (S/M/L) | Treated as single item with base price; refine in later iterations |
| Social login (Google, etc.) | Email/password sufficient for v1 |
| Mobile app | Web-first; responsive design only |
| Real-time WebSocket updates | 15-min polling via Inngest is sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| MELI-01 | Phase 2 | Pending |
| MELI-02 | Phase 2 | Pending |
| MELI-03 | Phase 2 | Pending |
| MELI-04 | Phase 2 | Pending |
| LIST-01 | Phase 2 | Pending |
| LIST-02 | Phase 2 | Pending |
| LIST-03 | Phase 2 | Pending |
| SALE-01 | Phase 2 | Pending |
| SALE-02 | Phase 2 | Pending |
| MARG-01 | Phase 3 | Pending |
| MARG-02 | Phase 3 | Pending |
| MARG-03 | Phase 3 | Pending |
| MARG-04 | Phase 3 | Pending |
| MARG-05 | Phase 3 | Pending |
| COST-01 | Phase 3 | Pending |
| COST-02 | Phase 3 | Pending |
| COST-03 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| KPI-01 | Phase 4 | Pending |
| SYNC-01 | Phase 4 | Pending |
| SYNC-02 | Phase 4 | Pending |
| ALRT-01 | Phase 4 | Pending |
| ALRT-02 | Phase 4 | Pending |
| ALRT-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after initial definition from PRD_F1_Radiografia.md*
