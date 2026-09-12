# FlipScout roadmap

1. Dashboard UI and mock deals.
2. Calculator and BUY Score.
3. PostgreSQL/Prisma foundation. Current artifact uses PostgreSQL through pg; Prisma has not been introduced.
4. Geolocation and store search — feature implementation complete; deployment/device acceptance remains environment-specific.
5. Multi-retailer clearance and penny discovery — common discovery connections implemented for all 12 requested retailers. Home Depot and Walmart retain pilot sources; the other ten use labeled Google Shopping online offers with merchant validation. Shared PostgreSQL search caching lasts 12 hours. Live successes and provider failures are recorded in [the current checkpoint](PHASE5-ALL-RETAILERS.md). Verified store-level clearance/penny inventory across all retailers remains in progress; online offers are not shelf-stock evidence.
6. Resale evidence and profitability ranking — product matching, legitimate sold-price evidence where available, separate asking prices, marketplace fees, shipping/cost assumptions, sales velocity and explained BUY / MAYBE / SKIP.
7. Alerts/watchlists — notify on relevant local opportunities and meaningful price/availability changes.

Existing early watchlist and route prototypes do not change this milestone order.

Product direction and Phase 5 acceptance criteria: [PRODUCT-DIRECTION.md](PRODUCT-DIRECTION.md).

Retailer rollout: Tier 1 Home Depot, Lowe’s, Walmart, Target; Tier 2 Dollar General, Walgreens, CVS; Tier 3 Costco, Sam’s Club, Best Buy, Tractor Supply, Office Depot.

Immediate objective: browse sales, clearance and penny candidates. Resale analysis is optional and remains a later priority. Current BUY Score is a heuristic and does not yet include sold-price data or sell-through.
