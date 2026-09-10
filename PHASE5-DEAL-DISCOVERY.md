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
