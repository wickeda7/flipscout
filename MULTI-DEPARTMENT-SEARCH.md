# Broader retailer searches

All connected retailers now combine internal department queries, deduplicate products and balance the merged list. No category selector is required. Sales, Clearance, Pennies and sort buttons filter the loaded results locally.

Walmart and Target use six department queries. Home Depot retains five queries and now interleaves their results before its product verification cap. Google Shopping feeds use six retailer-specific queries for Lowe’s, Dollar General, Walgreens, CVS, Costco, Sam’s Club, Best Buy, Tractor Supply and Office Depot. For example, Best Buy searches computers, televisions, audio, appliances, gaming and smart home.

Search concurrency is limited to two per scan. Failed groups are reported; all failed groups produce an error. Existing verified-price and merchant checks remain. Six queries can consume up to six provider searches per uncached page, plus existing Walmart/Home Depot product-detail checks (up to 40). This is broader coverage, not exhaustive inventory or guaranteed department representation.

The shared PostgreSQL cache lasts 12 hours. New cache versions bypass old narrow results for Target, Shopping and Home Depot. No schema or environment changes. Lowe’s official onboarding is still pending: its current feed and other Google Shopping feeds show online offers, not verified local inventory. Target remains Brandon #812 only; Home Depot retains its existing East Brandon coverage. Walmart uses its existing nearest-store resolver.

## Install and verify

```sh
yarn install --frozen-lockfile
yarn test:shopping
yarn test:target
yarn test:walmart
yarn test:home-depot
yarn test:discovery
yarn test:discovery:cache
yarn typecheck:api
yarn build:web --webpack
```

Copy into the existing checkout while preserving .env, commit and push to the Render-connected branch, and deploy API and web. Release validation uses fixtures; no paid live all-retailer scan was run. The optional PostgreSQL integration test needs its configured test database.
