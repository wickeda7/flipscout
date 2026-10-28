# Walmart product matching

Walmart now uses SerpApi's Walmart search and Walmart Product engines. Google Shopping results are no longer used for Walmart. Each displayed markdown is rechecked against the same numeric Walmart item ID, store context, Walmart seller ID, USD price and comparison price. Product details supply the displayed price, variant and fulfillment availability. A mismatch is omitted. Links go directly to https://www.walmart.com/ip/ITEM_ID.

Each page combines six clearance keyword searches (tools, home, electronics, toys, outdoor, clothing) at one nearby store, not a complete inventory scan. Search requests run two at a time. Candidates are interleaved across departments and deduplicated before the verification cap. Department failures and product verification coverage are reported separately. Up to 40 discounted candidates per page receive product checks, four concurrently, with a three-minute verification queue deadline (in-flight requests can take another 105 seconds). Incomplete checks are reported as partial coverage. A complete verification outage fails without caching an empty success. Each cold page costs six searches plus up to 40 product requests; cached pages and local filters/sorting cost none. No automatic retries.

Only explicit comparison prices qualify; a clearance search term alone does not prove an item is clearance. Such markdowns are shown as Sales; one-cent prices as Pennies. Shelf quantities are unknown. Pickup/shipping reflect the provider's product response. Set the same store, seller and variant on Walmart. Provider caching, price changes and browser fulfillment settings can still produce differences; this is not a checkout-price guarantee.

Database cache remains 12 hours, keyed by ZIP, retailer, page and category. A new Walmart cache version bypasses old Google results. No new migration beyond the existing discovery cache table. Keep your existing apps/api/.env with DATABASE_URL and SERPAPI_API_KEY; keys stay on the API server.

## Setup and checks (Yarn Classic, Node 22)

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn typecheck:api
yarn test:walmart
yarn test:shopping
yarn test:discovery:cache
yarn build:web --webpack
```

Start in two terminals:

```sh
yarn dev:api
```

```sh
yarn dev:web
```

Optional paid provider/database check, followed automatically by a cache-reuse check:

```sh
yarn check:retailers walmart 33511
```

## Store data and attribution

Bundled walmart-stores.json contains 4,603 US stores joined by postal code. Source: https://serpapi.com/walmart-stores.json (directory: https://serpapi.com/walmart-stores). Mexico entries are excluded. 19 US directory entries without a matching postal centroid are omitted.

ZIP coordinates: GeoNames https://www.geonames.org/ and https://download.geonames.org/export/zip/US.zip, Creative Commons Attribution 4.0: https://creativecommons.org/licenses/by/4.0/. Snapshot downloaded September 2026. Derived data joins each store address/ID to its ZIP centroid. Data provided as-is without accuracy or completeness warranty. Distances are between ZIP centroids, not store entrances or driving distances; stores in one ZIP tie and are selected deterministically by store ID. Query ZIP coordinates use Zippopotam.us. A valid ZIP without a listed store inside the selected radius returns no connected coverage, not a claim that no deals exist.

Refresh the snapshot by downloading the two documented sources, excluding Mexico (country MX or address ending ', MX'), joining postal_code to GeoNames US.txt column 2 and coordinates columns 10/11, and retaining id, zip, address, latitude, longitude. Review data changes before deployment.

## Live validation

ZIP 33511 resolved to Walmart #2387, 11110 Causeway Blvd. A real search returned 37 results. One product lookup verified item 17777607438 at $2.51 versus $7.98, Walmart.com seller, richblack / S (6–7) variant, shipping available and pickup unavailable. This verifies the integration path, not every search result or current checkout prices.

The multi-department release uses cache version walmart-multidepartment-v2, bypassing older single-keyword results. Tests use provider fixtures; no live six-department scan was run for this update.
