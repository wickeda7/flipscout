# FlipScout roadmap

1. Dashboard UI and mock deals.
2. Calculator and BUY Score.
3. PostgreSQL/Prisma foundation. Current artifact uses PostgreSQL through pg; Prisma has not been introduced.
4. Geolocation and store search — feature implementation complete; deployment/device acceptance remains environment-specific.
5. Multi-retailer clearance and penny discovery — in progress. Target Home Depot, Target, Walmart, Lowe’s, Dollar General, Walgreens, CVS, Costco, Sam’s Club, Best Buy, Tractor Supply, and Office Depot, and more; validate Home Depot first. Prioritize a validated store-specific data source, SKU/product identity, timestamped price and stock observations, nearby discovery, and evidence-backed shopper reports. The optional Best Buy lookup is an experiment, not completion of this milestone. A Home Depot product lookup succeeded; the new category deal list is implemented, but both live category checks returned provider 503 errors. Persistent observations and broader discovery remain outstanding.
6. Resale evidence and profitability ranking — product matching, legitimate sold-price evidence where available, separate asking prices, marketplace fees, shipping/cost assumptions, sales velocity and explained BUY / MAYBE / SKIP.
7. Alerts/watchlists — notify on relevant local opportunities and meaningful price/availability changes.

Existing early watchlist and route prototypes do not change this milestone order.

Product direction and Phase 5 acceptance criteria: [PRODUCT-DIRECTION.md](PRODUCT-DIRECTION.md).

Retailer rollout: Tier 1 Home Depot, Lowe’s, Walmart, Target; Tier 2 Dollar General, Walgreens, CVS; Tier 3 Costco, Sam’s Club, Best Buy, Tractor Supply, Office Depot.

Immediate objective: browse sales, clearance and penny candidates. Resale analysis is optional and remains a later priority. Current BUY Score is a heuristic and does not yet include sold-price data or sell-through.
