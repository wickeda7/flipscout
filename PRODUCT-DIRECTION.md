# FlipScout product direction

Updated September 9, 2026 from the user's reference sites. This is the product scope, not a claim that these features or live sources are implemented.

The immediate priority is a simple list of sales, clearance and penny candidates. Profit analysis is optional and remains available separately. FlipScout is a multi-retailer retail-arbitrage platform: identify profitable local inventory faster by combining acquisition price, store availability, product matching, resale evidence, costs and sourcing distance. Clearance and penny discovery provide leads; evidence-based resale profitability determines their value. Target coverage is Home Depot, Target, Walmart, Lowe’s, Dollar General, Walgreens, CVS, Costco, Sam’s Club, Best Buy, Tractor Supply, and Office Depot, with additional retailers supported over time. Home Depot remains the first connection to validate; each retailer needs its own verified source. Keep Next.js web and future React Native on the shared API/PostgreSQL architecture, EN/VI language-only localization, USD/miles, and Yarn Classic.

## Reference findings

- BrickSeek: deal feed, markdown comparisons, local availability and member finds. https://brickseek.com/
- PennyCentral: shopper-submitted penny reports, guides, saved lists and report-a-find flow. https://www.pennycentral.com/
- Deal Soldier: ZIP-based discovery, local penny alerts and community delivery through Discord. https://dealsoldier.com/
- Scavenger: ZIP-based Home Depot inventory signals and community finds. https://scavenger.ai/
- Hidden Clearances: user-selected reference; site returned HTTP 403 during review. Features and data access were not verified. https://www.hiddenclearances.com/

Use these workflow ideas with FlipScout's own design. Access to competitor websites is not a data feed integration.

## Multi-retailer scanning scope

The scanner should accept ZIP/current location, radius and one or more retailers: Home Depot, Target, Walmart, Lowe’s, Dollar General, Walgreens, CVS, Costco, Sam’s Club, Best Buy, Tractor Supply, and Office Depot, or all connected retailers. Additional retailers can be added through the connector framework.

Show each source separately as connected, not configured, checking, failed or stale. “All retailers” means all working configured connections, not assumed coverage. A missing connection must never appear as zero deals or a successful scan. Report partial success when one retailer fails. Results need retailer, store, product identifiers, price scope, availability semantics and last observation time. Keep penny candidates distinct from confirmed shopper reports and ordinary clearance.

A Home Depot category-search adapter and homepage now exist; two live category checks returned provider 503 errors. The earlier single-product lookup succeeded separately. Target, Walmart and Lowe’s are not connected. See PHASE5-DEAL-DISCOVERY.md for current limits.

## Intended shopper workflow

1. Enter ZIP or use current location, choose radius and retailer.
2. Browse nearby clearance and penny candidates with filters for price, discount, category, distance and observation age.
3. Open a product to compare store-specific observations, SKU/UPC, source and last check time.
4. Distinguish retailer/provider observations from shopper-reported finds; keep unavailable and unknown quantities explicit.
5. Save a target or submit an in-store price report. Later alert delivery remains Phase 7.
6. Evaluate estimated resale profit using the existing calculator; validated resale comparisons arrive in Phase 6.

## Phase 5 implementation order

1. Validate one Home Depot source using known product/store examples. Check product identifiers, store identity, local versus online price, observed timestamps, quantity semantics and clearance coverage. Confirm whether penny prices are actually exposed. SerpApi is the pilot source; category discovery still needs a successful live result.
2. Introduce a shared product identity and append-only observations for price, availability, source, store and observation time. Separate provider fetch time from upstream observation time. Unknown quantity must not become zero or one.
3. Connect nearby discovery and SKU lookup to those observations. Label stale records and distinguish local price from catalog price. A clearance inference must not become a retailer-confirmed clearance label.
4. Add authenticated shopper reports with store, product, price and observed date; moderation and receipt privacy are required before public evidence uploads. A shopper report does not establish remaining inventory.
5. Validate one complete real-data flow: source fetch → normalization → PostgreSQL observation → shared API → web result. Verify idempotency, stale handling and source failures. Keep synthetic data clearly labeled.

Acceptance: at least one real Home Depot store/product observation is displayed with honest provenance and timestamp; a repeat fetch updates it without duplication; missing data remains unknown; failure never substitutes mock inventory. Penny coverage must be separately demonstrated rather than inferred from ordinary product pricing. Phase 5 cannot be called complete before this acceptance path passes.

## Current state and limits

Phase 4 store search and inventory UI are implemented. Generic HTTP feed normalization, pagination, retry/timeout handling, scheduling and preflight reports exist. An optional Best Buy on-demand lookup exists but has not been live-validated with credentials. Home Depot category discovery is implemented for one store, with live validation blocked by provider errors. Persistent price observations, shopper reports and expanded nearby coverage remain to be implemented.

Scavenger's public terms describe third-party retailer/partner information but do not name the upstream provider: https://scavenger.ai/terms . SerpApi documents a possible Home Depot product/store lookup: https://serpapi.com/home-depot-product . Neither establishes that Scavenger uses SerpApi or that its feed exposes penny prices. A provider account and a controlled real-data check are needed before selecting this path.

## Reconciled original conversation

The user supplied the earlier conversation directly. Its product intent is recorded here; its time-sensitive vendor/API coverage claims are research leads, not independently verified facts or proof of access.

### Retailer rollout

- Tier 1: Home Depot, Lowe’s, Walmart, Target.
- Tier 2: Dollar General, Walgreens, CVS.
- Tier 3: Costco, Sam’s Club, Best Buy, Tractor Supply, Office Depot; expand later.

Home Depot remains the first target to validate. Source feasibility may affect implementation order, but an easier optional retailer lookup does not replace Tier 1 clearance coverage.

### End-to-end opportunity model

Local price and stock observation → UPC/GTIN/SKU identity matching → resale-market evidence → fees, shipping and acquisition costs → expected profit and ROI → sales velocity and sourcing distance → explained BUY / MAYBE / SKIP recommendation.

Product matching must account for model, pack size, condition and variant. Retailer SKUs are retailer-scoped; a matching title alone is insufficient evidence of the same product. Preserve match confidence and source provenance.

Resale inputs must distinguish asking prices, verified sold-price observations and user assumptions. Do not label active listings as sold comparables. Do not infer sell-through probability without defensible sales and listing-volume evidence. Missing evidence should be visible rather than replaced by an invented probability.

Profit analysis should incorporate purchase price, applicable acquisition costs, marketplace fees, shipping/packaging and explicit return/cost assumptions. Show per-unit and trip economics separately. MSRP discount is context, not evidence that a product will resell profitably.

The original multiplicative BUY SCORE expression is conceptual, not a production formula. The existing core score currently weights ROI, profit, discount, inventory and distance; it has no sold-price evidence, sales velocity or sell-through input. Phase 6 must introduce those inputs and explain uncertainty before claiming evidence-backed resale recommendations. Preserve current behavior until new contracts and tests justify a scoring change.

### Architecture and milestone boundaries

Continue Next.js web plus future React Native on the shared backend/API/PostgreSQL. The earlier mention of Strapi and Elasticsearch describes background, not an instruction to replace this architecture. PostgreSQL currently uses pg; Prisma is not implemented. Keep EN/VI language-only behavior and Yarn Classic.

Phase 5 acceptance remains a real retailer/store/product observation flowing through ingestion, PostgreSQL and the shared API into the web UI. Phase 6 adds resale evidence and upgraded profitability ranking. Phase 7 adds alert delivery and mature watchlists. Shopper reporting is a supporting evidence path; it must not delay validation of the first retailer feed. Subscription monetization is a possible later business model, not current implementation scope.

### Source-validation leads from the prior conversation

Re-check official Lowe’s developer access, permitted store pricing/inventory fields and credential eligibility. Distinguish Walmart Marketplace seller APIs from physical-store clearance access. Verify eBay sold-data access separately from active-listing search, and verify Amazon seller eligibility and fee/pricing endpoints before implementation. No API access is established by the pasted conversation alone.
