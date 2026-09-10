# Phase 5: sales, clearance and penny discovery

The homepage is now a category-based Home Depot deal list. No product ID is required.
The previous profit dashboard remains at /analysis; store search and the calculator remain available.

## Setup (Yarn Classic, Node 20.9+)

From the extracted flipscout directory:

```sh
yarn install --frozen-lockfile
```

Keep your existing apps/api/.env and apps/web/.env.local when upgrading.
For a fresh checkout, copy apps/api/.env.example to apps/api/.env and
apps/web/.env.example to apps/web/.env.local.

Set SERPAPI_API_KEY in apps/api/.env. Do not place it in the web environment.
Use NEXT_PUBLIC_FLIPSCOUT_API_URL=http://localhost:4000 in the web environment.

```sh
yarn dev:api
```

In another terminal:

```sh
yarn dev:web
```

Open the address printed by Next.js (normally http://localhost:3000), choose a
category and deal type, then select Find deals. No paid request runs on page load.
The existing PostgreSQL configuration can remain in place. This checkpoint adds
no database migration or seed requirement; discovery does not persist results
to PostgreSQL yet. Existing store/dashboard features still use DATA_PROVIDER.

## Scope and evidence

- Fixed pilot: Home Depot East Brandon #6305, ZIP 33511.
- Five category keywords: tools, appliances, lighting, lawn and garden, storage.
- A search checks one provider result page, requesting up to 24 products.
  Pagination is capped at ten pages. This is not a whole-store inventory scan.
- Sales require numeric price_was greater than price.
- Clearance requires an explicit price_badge of Clearance; titles are not proof.
- Penny candidates require numeric price exactly $0.01. Price and availability
  still need in-store confirmation. Penny searches request upperbound=0.01.
- No exact local inventory counts are claimed by this search adapter.
- Prices are returned in the requested store context, not guaranteed register prices.
- Unsupported/missing data is omitted or unknown, never replaced by demo inventory.
- Other retailers are not connected by this feature.

The mapping and parameters follow the official documentation:
https://serpapi.com/home-depot-search-api

## Shared API and safeguards

GET /v1/discovery/home-depot?category=tools&kind=all&page=1

category: tools | appliances | lighting | garden | storage
kind: all | sale | clearance | penny
page: 1..10

The shared types and API client are available to the future React Native app.
The API validates query parameters, store/ZIP/category/page response context and
product identity. Provider URLs and raw error bodies are not returned.
Errors have safe codes; a failed search returns HTTP 503, invalid filters 400.

Identical requests are coalesced and successful normalized results cached for ten
minutes in memory (maximum 50 entries). At most two provider requests can run
concurrently per API process; each client is limited to ten requests per minute.
A request times out after 105 seconds with no automatic paid retries.
Provider responses are limited to 4 MB and redirects are refused. SerpApi can
also return cached data; provider creation time and local retrieval time are shown.
Restarts clear the application cache. Rate limits/cache are not distributed.

## Validation, September 9, 2026

```sh
yarn typecheck:api
yarn test:discovery
yarn test:stores
yarn test:feed
yarn test:bestbuy
yarn test:home-depot
yarn build:web --webpack
```

Passed: API typecheck, 13 discovery tests, 35 existing regression tests, and
production web build. Browser inspection checked the English homepage and
Vietnamese labels. API smoke checks verified missing-key 503 and invalid-query 400.

Live verification limitation: two category requests for tools/store 6305/33511
returned SERPAPI_HTTP_503. This checkpoint therefore does not demonstrate a
successful live category deal list. The earlier individual-product Playground
success is separate evidence and does not validate category discovery or pennies.
No mock or historical product was inserted into the live list as a workaround.

Next acceptance step: obtain one successful category response, confirm its
normalization and store context, then add persistent observations and broader
discovery. Phase 5 remains in progress.

## ZIP / radius and filter-button update

Find deals now accepts a five-digit US ZIP and radius choices of 5, 10, 15, 20,
or 25 miles. The API accepts whole miles 1–25 and rejects other values.
Defaults remain ZIP 33511 and 25 miles. All Deals, Sales, Clearance and Penny
candidates select the deal type; Highest % and Lowest $ sort only the current
page, without another paid request. Selecting a deal type after searching starts
a new first-page request with the last submitted location.

The API resolves the ZIP center through https://api.zippopotam.us/us/{zip},
with an eight-second timeout, and measures approximate straight-line distance
to the single connected pilot store. It does not discover additional stores.
An out-of-range ZIP returns explicit no-connected-store coverage and makes no
SerpApi request. Missing ZIPs and lookup failures remain distinct errors.

Store identity/address reference:
https://www.homedepot.com/l/East-Brandon/FL/Brandon/33511/6305
Approximate store coordinate reference:
https://www.merchantcircle.com/fl-brandon/home-and-garden/home-repair-and-improvement/lumber
Distances are approximate ZIP-center distances, not driving distances or
distances from the shopper's address. The retailer request retains store 6305
and delivery ZIP 33511; the shopper's ZIP is used for distance filtering only.

Validation for this update: 18 discovery/location tests, API typecheck and
production build passed. The live ZIP service returned Brandon, FL coordinates
for 33511. No additional paid retailer searches were made. Run:
yarn test:discovery
yarn typecheck:api
yarn build:web --webpack

No new keys, dependencies or database migrations are required.

## Remembered settings and shareable links

The Find deals page remembers valid ZIP, radius, category, deal type and sort
settings in browser local storage when available. Copy search link generates a
link containing only those settings. If clipboard access is unavailable, a
selectable link field appears. Reset filters restores ZIP 33511 / 25 miles /
Tools / All deals / default ordering and clears the displayed search.

Explicit search-link settings override device preferences. Invalid values are
replaced with defaults. Leading zeros in ZIP codes are preserved. Page numbers,
credentials and automatic-execution flags are never saved or shared.
Opening a link or refreshing the page only restores controls; Find deals must
be selected to run a provider search. Device preferences are not account-synced.

Five new settings tests passed, covering precedence, malformed storage, invalid
and duplicate URL parameters, leading-zero ZIP codes and exclusion of secrets.
Production build passed. No paid searches were made for this UI update.

Setup remains yarn install --frozen-lockfile, then yarn dev:api and yarn dev:web
in separate terminals. Test with yarn test:discovery and yarn build:web --webpack.
No environment changes or database migrations are needed.

## Automatic discovery: category selector removed

Find deals now requires only ZIP, radius and an optional deal-type filter.
The backend automatically combines tools, appliances, lighting, lawn/garden
and storage searches. This is bounded coverage, not a whole-store inventory scan.
Old saved category preferences and shared category links no longer restrict the
web search. New shared links omit category entirely.

The API defaults category to all; explicit category values remain supported
for compatibility with older API clients. An all search requests one page from
each of five groups, with a maximum of two simultaneous provider requests
across the API process. One uncached search can use five provider requests and
may take several minutes. Requests are not automatically retried.

Results are deduplicated by product ID. Partial failures return successful
results with completed/failed/total coverage counts. Total failure remains an
error, never empty inventory. The provider timestamp is the oldest timestamp
among the successful groups, or unknown if any successful group lacks one.
Products checked counts rows before deduplication. Next page advances each
group's provider offset together, not a globally ranked inventory page.
Highest % and Lowest $ still sort only the returned combined page.
Successful and partial combined results use the existing ten-minute cache.

Validation: all 26 discovery, location and settings tests passed; API typecheck
and production web build passed. No paid provider requests were made.
Existing live provider 503 limitations and single-store coverage still apply.
Run yarn test:discovery, yarn typecheck:api and yarn build:web --webpack.
No migration or environment changes are required.
