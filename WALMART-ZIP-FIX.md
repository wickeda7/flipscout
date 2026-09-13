# Walmart: ZIP-based online offers

Walmart no longer requires ZIP 33511 or store 3463. It now uses the same ZIP-aware Google Shopping connector as the other online retailers. Each five-digit US ZIP is resolved to its state and sent as the provider search location. A missing or unresolvable ZIP produces a location error, not the old pilot restriction.

These are online offers attributed to Walmart by the provider. This is not verified store-level clearance, pickup inventory, delivery availability, or a 25-mile inventory scan. Radius remains disabled for online offers. A search returns one bounded page, with no fabricated pagination. Deal filters and sorting run locally without additional requests.

The shared PostgreSQL cache still lasts 12 hours per ZIP, retailer and query scope. Walmart now uses the online-source cache scope, so old Brandon-store responses cannot be returned for the new search. Existing rows do not need deletion and the database schema does not change.

## Install

Use this complete update, preserving your existing private env files. Restart both services after updating API and web files:

```sh
yarn dev:api
```

In another terminal:

```sh
yarn dev:web
```

No new keys or database settings are required. If installing into a new directory, first run `yarn install --frozen-lockfile`; run `yarn db:migrate` only if the earlier search-cache migration has not been applied.

## Verify

```sh
yarn test:walmart
yarn test:shopping
yarn test:discovery:cache
yarn typecheck:api
yarn build:web --webpack
```

Tests cover 33511, 10001, 90210 and leading-zero ZIP 02108 with controlled provider responses, wrong-ZIP rejection, merchant validation, no invented store stock, and cache separation from the old pilot. These tests do not claim all ZIPs or retailer inventory were verified live.

Optional live check (uses a provider search on a cache miss):

```sh
yarn check:retailers walmart 10001
```

Example API:

```text
http://localhost:4000/v1/discovery?retailer=walmart&zip=10001&radiusMiles=25&kind=all&page=1
```

Provider reference: [Google Shopping location search](https://serpapi.com/google-shopping-api). The [Walmart-specific search engine](https://serpapi.com/walmart-search-api) accepts a store ID rather than a ZIP; this update does not invent a ZIP parameter for that engine. Home Depot's existing pilot is unchanged.

## Recorded validation

On September 13, 2026, a live search for ZIP 10001 returned 40 Walmart online offers. A repeated search returned the database copy with an unchanged 12-hour expiry. See validation/walmart-zip-live-check.jsonl. Twenty-one relevant automated tests (including real PostgreSQL cache validation), API typecheck, and the production web build passed.
