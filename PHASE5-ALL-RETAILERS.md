# Phase 5: all-retailer discovery connections

Continues `flipscout-phase5-database-cache.zip`. All 12 requested retailers can now be selected and searched. Home Depot and Walmart retain their existing pilot sources; the other ten use the configured SerpApi key with Google Shopping. These are online offer discovery connections, not twelve verified local inventory APIs. See `validation/all-retailer-live-cache-check.jsonl` for the recorded live outcomes, including failures.

## What changed

- Added Lowe’s, Target, Dollar General, Walgreens, CVS, Costco, Sam’s Club, Best Buy, Tractor Supply and Office Depot to the shared discovery API and web flow.
- Merchant identity must match an explicit retailer alias. Product-title keywords and retailer names in the search query do not prove who sells an offer. Other merchants are excluded.
- Only supported USD price comparisons, explicit clearance tags, or an exact $0.01 price become deals. “Was $…” comparison prices are supported. A title mentioning clearance or pennies is insufficient.
- New retailer results are marked **Online offers**. Stock quantities and store IDs are absent; radius is disabled. ZIP is resolved to a state through Zippopotam.us to set the Google Shopping search location; this is not proof of local availability. ZIP lookup happens only after a database cache miss. Offer links may open a Google comparison page. Membership, coupons, shipping, variants and checkout conditions still need checking.
- The same database cache stores normalized results by ZIP, retailer and source/query scope for **12 hours**. Cache reads do not extend expiry. Different users and API processes share results. Empty and partial successful searches are cached; provider failures are errors and never become empty inventories.
- Find deals requests all supported deal types together. Sales / Clearance / Pennies and Highest % / Lowest $ operate locally on the returned page. No category selector or automatic paid search on page load.
- Google Shopping currently ignores offset pagination. Its connector makes one provider request per uncached ZIP/retailer search and returns `hasMore: false`; it does not charge for duplicate “next pages.” Home Depot/Walmart retain their existing pagination. This is a bounded search, not all inventory at a retailer.
- Search diagnostics show matched merchants and excluded listings. Error responses contain safe codes, never provider request URLs or keys.

The Next.js web app and future React Native clients use the same `/v1/discovery` API and shared TypeScript contracts. EN/VI affects language only; prices remain USD and distances remain miles.

## Recorded validation — ZIP 33511, September 10, 2026

46 automated tests passed, including temporary-table PostgreSQL cache validation. API typecheck and the production web build passed. Four new online retailers also returned HTTP 200 database hits through a separate API process.

| Retailer | Latest verified result | Database reuse |
|---|---|---|
| Home Depot | 20 deals; partial Home Depot coverage | Verified |
| Lowe’s | Provider HTTP 503; results unverified | Not verified for live results |
| Walmart | 19 deals | Verified |
| Target | Provider HTTP 503; results unverified | Not verified for live results |
| Dollar General | Provider HTTP 503; results unverified | Not verified for live results |
| Walgreens | 40 deals | Verified |
| CVS | 19 deals | Verified |
| Costco | Provider HTTP 503; results unverified | Not verified for live results |
| Sam’s Club | 5 deals | Verified |
| Best Buy | 40 deals | Verified |
| Tractor Supply | Provider HTTP 503; results unverified | Not verified for live results |
| Office Depot | Provider HTTP 503; results unverified | Not verified for live results |

The all-retailer run and subsequent Sam’s Club/Best Buy checks are retained separately in `validation/` so the earlier provider failures remain visible. Counts describe these bounded searches only. No penny inventory coverage is claimed.

## Setup with Yarn Classic

From the extracted `flipscout` directory:

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn db:check
yarn typecheck:api
yarn test:discovery
yarn test:walmart
yarn test:shopping
yarn test:discovery:cache
yarn build:web --webpack
```

Keep your existing `apps/api/.env` with working `DATABASE_URL`, `DATA_PROVIDER=postgres`, and `SERPAPI_API_KEY`. **No new retailer keys or database connection changes are required for this update.** The cache table was introduced in the previous checkpoint; this update adds no new schema. Migration is additive and does not seed demo data. The PostgreSQL integration test uses a temporary table and skips if `DATABASE_URL` is absent.

Keep `apps/web/.env.local` (or the existing web env file) pointed at your API with `NEXT_PUBLIC_FLIPSCOUT_API_URL=http://localhost:4000`. Never put the SerpApi key in web env variables. Match API `WEB_ORIGIN` to the web address if you use a different port.

Run in separate terminals:

```sh
yarn dev:api
```

```sh
yarn dev:web
```

Choose a retailer, enter ZIP `33511`, and select Find deals. Home Depot still covers only its East Brandon pilot store; Walmart still accepts ZIP `33511` only. The ten online connectors accept five-digit US ZIP input, but only `33511` was included in this live validation. They do not resolve or guarantee nearby stores.

## Live API and cache checks

```sh
yarn check:retailers walgreens 33511
yarn check:retailers cvs 33511
```

Explicitly check every retailer:

```sh
yarn check:retailers all 33511
```

This is an opt-in live check: uncached or expired results use provider searches. It runs at most two retailer checks concurrently. Each success is searched again to verify database reuse and an unchanged expiry. Exit codes: `0` all complete and cache verified; `2` partial coverage; `1` any failure. HTTP 503/provider errors mean unavailable data, not “no deals.” The command prints safe per-retailer diagnostics.

Retailer IDs: `home-depot`, `lowes`, `walmart`, `target`, `dollar-general`, `walgreens`, `cvs`, `costco`, `sams-club`, `best-buy`, `tractor-supply`, `office-depot`.

Example API URL:

```text
http://localhost:4000/v1/discovery?retailer=walgreens&zip=33511&radiusMiles=25&kind=all&page=1
```

For online offers, `radiusMiles` does not filter results or change cache identity. New online connections support `category=all` and `page=1` only. A different ZIP/retailer has a separate cache. There is no client-controlled cache bypass or automatic fallback to another retailer. After 12 hours, the next search refreshes the data.

## Provider reference and remaining coverage

[SerpApi Google Shopping documentation](https://serpapi.com/google-shopping-api) documents the engine, location parameter, pricing fields and current pagination limitation. The existing [Home Depot](https://serpapi.com/home-depot-search-api) and [Walmart](https://serpapi.com/walmart-search-api) adapters remain separate. No private retailer endpoints were invented.

This completes the common discovery connection path for the requested retailer list. Verified store-level clearance and penny inventory across all twelve retailers remains a separate data-access milestone. Online search results and merchant labels are not checkout confirmation, and provider errors can prevent a retailer from returning offers on a particular attempt. Phase 6 resale/sold-price integration is not part of this update.

The ZIP excludes dependencies, build output, real env files and secrets. Live search results remain in your configured PostgreSQL database; only safe validation summaries are included in the package.
