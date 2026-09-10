# Shared 12-hour retailer search cache

This checkpoint supersedes the earlier ten-minute discovery cache and manual
partial-retry behavior for API and diagnostic searches.

## Behavior

1. Look up the requested ZIP + retailer + result-page scope in PostgreSQL.
2. If expires_at is later than database server time, return the saved result.
   No retailer request or ZIP lookup runs on a cache hit.
3. If missing or at least 12 hours old, fetch the provider, save the complete
   normalized search response and timestamps, then return it.
4. Other users and restarted API processes reuse that same database row.

All returned deal types, pickup observations, source timestamps and coverage
diagnostics are stored as JSONB. Raw credential-bearing provider responses
are never stored. The primary lookup includes ZIP and retailer; page and
internal product-group scope also distinguish entries to avoid mixing page 1
with page 2. The public UI always requests all groups and all deal types.
Filters, sorting and changing Home Depot radius reuse the same stored data.
Home Depot radius is applied after retrieving the maximum supported 25-mile
area. Walmart radius coverage is not verified, so its radius selector is disabled.

Successful empty results and partial results are cached for the full 12 hours.
The Retry unchecked groups button is removed. retryFailed cannot bypass a
fresh database row. A failed whole scan is not saved as an empty success, and
a failed refresh does not extend an expired row. Stale results are not silently
served as fresh. In-memory caches never override the database TTL.

A PostgreSQL advisory lock prevents separate workers from requesting the same
expired search simultaneously. A competing in-progress request returns busy;
it does not make a duplicate provider call. The database must be available:
there is no paid-request fallback when cache storage is unavailable.

The UI displays database/new-result status and the next eligible refresh time.
Old cache rows remain until that scope is requested and overwritten; expiry
is enforced on reads, not dependent on a cleanup scheduler.

## Walmart pilot

Walmart is now enabled as a separate selectable retailer alongside Home Depot.
It uses SerpApi's documented walmart engine and store_id=3463, for the official
Brandon store at 1208 E Brandon Blvd, ZIP 33511.
- Search query is clearance; this keyword alone does not establish a clearance label.
- Only Walmart/Walmart.com seller offers are included; third-party sellers are excluded.
- Sales require a numeric supplied comparison price above the current USD price.
- Penny candidates require price exactly $0.01; clearance requires an explicit badge.
- Shelf stock is unknown. Offers can be online prices; pickup is not verified.
- This pilot accepts ZIP 33511 only. Other ZIP codes receive an unsupported-location error.
- Selecting Home Depot never silently substitutes Walmart products.

Sources:
https://serpapi.com/walmart-search-api
https://www.walmart.com/store/3463-brandon-fl

## Setup

Preserve apps/api/.env (DATABASE_URL, SERPAPI_API_KEY) and your web environment.
From the extracted project:

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn db:check
yarn dev:api
```

In a second terminal:

```sh
yarn dev:web
```

The additive migration creates discovery_search_cache and a ZIP/retailer/expiry
index. It does not seed or delete inventory. PostgreSQL is required for live
discovery even if other screens use DATA_PROVIDER=mock.

The narrow cache table migration was already applied to the configured database
during this session's authorized real-data test. Running db:migrate remains
safe for upgrading another checkout or database.

## Validation

```sh
yarn test:discovery
yarn test:stores
yarn test:discovery:cache
yarn test:walmart
yarn typecheck:api
yarn build:web --webpack
```

57 tests passed: 51 discovery/store regressions, 3 cache tests (including real
PostgreSQL), and 3 Walmart tests. API typecheck and production build passed.
The PostgreSQL test uses a temporary table on an isolated connection, leaving
production cache rows unchanged. Its database test skips if DATABASE_URL is absent.
It verifies exact 12-hour lifetime, no TTL extension on reads, cache reuse by a
new service instance, partial-result reuse, radius reuse, expiry-triggered
refresh, and failure without extending stale data.

Live verification, September 10, 2026:
- Home Depot: 20 deals, 2/5 groups successful; other groups hit provider 503/cooldown.
- Walmart: 40 products returned, 19 qualifying Walmart-sold deals normalized.
- Both first searches wrote to PostgreSQL. Both identical second searches used
  the database without another retailer fetch.
- Real HTTP GET /v1/discovery requests for retailer=home-depot and retailer=walmart,
  ZIP 33511, page 1 both returned HTTP 200 and cache.source=database after a new
  API process started with DATA_PROVIDER=postgres.

Existing yarn check:discovery and yarn check:discovery:scan commands now use
the same database cache. They spend provider credits only on missing/expired
entries. No guaranteed penny inventory or broader retailer coverage is claimed.
