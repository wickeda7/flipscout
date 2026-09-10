# Phase 4 closeout and Phase 5 retailer connection

Phase 4 geolocation/store search is feature complete in this checkpoint: location permission/manual coordinates, radius and catalog search, paginated store inventory, filters/sorting, and existing-database upgrades. Final polish adds search retry and labels PostgreSQL demo inventory as sample data. Real-device geolocation permissions and a standalone PostgreSQL deployment still need environment acceptance checks.

Phase 5 is started, not completed: an on-demand Best Buy product/store-availability connection is implemented from official documentation, with a shared API/client and EN/VI Stores-page lookup. No live retailer request was validated because a developer key was not supplied. Home Depot remains the desired clearance/penny data investigation; no Home Depot or Scavenger connector is represented as live.

## Setup

Use Node 20.9+ and Yarn Classic 1.22. From the extracted project root:

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn db:check
yarn db:seed:demo
yarn dev:api
```

Keep DATA_PROVIDER=postgres and DATABASE_URL in your local apps/api/.env. Demo seeding is optional and creates only synthetic inventory. In another terminal run `yarn dev:web` and open /stores at the web address printed by Next.js.

For the optional Best Buy lookup, obtain a developer API key from https://developer.bestbuy.com/ and save it locally as BESTBUY_API_KEY in apps/api/.env, then restart the API. No key goes in browser configuration or the ZIP. On Stores, enter a ZIP and a current Best Buy product SKU. Missing key returns RETAILER_NOT_CONFIGURED, never mock results.

Shared endpoint:
`GET /v1/retailers/bestbuy/availability?zip=32746&sku=YOUR_NUMERIC_SKU`

Shared client: `getBestBuyAvailability(zip, sku, signal?)`.

The endpoint makes product and SKU/store-availability requests to api.bestbuy.com. Official API keys must be sent in query parameters; only this fixed-host implementation does so and does not log request URLs or upstream errors. Requests reject redirects, bound response size to 1 MB, time out at 15 seconds per attempt, and retry transient failures at most twice. The endpoint has a per-client limit of 10 lookups/minute using the existing limiter.

Results retain unknown quantities as null. Catalog prices are not local clearance prices. Availability checks do not enter PostgreSQL inventory, generate BUY scores, or alter trip profits. No exact quantities or penny prices are inferred. No bulk inventory ingestion or scheduling is enabled for this provider. Responses use Cache-Control: no-store.

## Feed preflight

The existing configured HTTP/JSON adapter now reports fresh/in-stock, stale, future-dated, zero-inventory and empty feeds, plus optional-field coverage:

```sh
yarn ingest:check YOUR_CONFIGURED_SOURCE
```

This reads the configured feed without database writes. Exit code 1 with status needs-review means future timestamps or no fresh in-stock deals; it does not automatically block later explicit ingestion. Full snapshots warn about possible deactivation. Source endpoints and mapping still must match the actual provider contract.

## Tests

```sh
yarn typecheck:api
yarn test:stores
yarn test:connectors
yarn test:feed
yarn test:bestbuy
yarn build:web --webpack
```

Executed: API typecheck, 18 store tests, 18 connector tests (including local HTTP), 4 feed-report tests, 7 Best Buy fixture tests, and Webpack production build. Fixtures validate the documented response contract and failure handling, not current provider account access. No live Best Buy or Home Depot data was fetched. A standalone PostgreSQL integration suite remains available as `yarn test:postgres` with TEST_DATABASE_URL configured to a disposable database.

## Public source research — 2026-09-09

Scavenger's terms describe aggregation of third-party retailer/partner pricing and inventory. Its help describes ZIP-based local Home Depot inventory signals and register verification. The reviewed public pages do not disclose the upstream API, vendor, scraping method or retailer agreement. Public homepage assets did not identify a provider. A SKU catalog plus repeated per-store observations and detection rules is an architectural inference, not a verified description of its implementation.

- https://scavenger.ai/terms
- https://scavenger.ai/help/how-scavenger-works
- https://scavenger.ai/help/verify-a-penny-price
- https://scavenger.ai/blog/home-depot-sku-lookup

SerpApi documents a third-party Home Depot product lookup with product_id, store_id and delivery_zip plus price and some availability fields. There is no evidence in the reviewed sources that Scavenger uses it. Its documentation does not establish reliable penny-price coverage. Validate a known product/store against observed clearance data before selecting it for ingestion.

- https://serpapi.com/home-depot-product
- https://developer.bestbuy.com/apis
- https://bestbuyapis.github.io/api-documentation/#in-store-availability
