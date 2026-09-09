# Phase 4.3 — store inventory search and sorting

Built on the retained Phase 4.2 working copy. Open Stores → View store deals to
search product names/brands, filter by category, and choose a sort order. Apply
and Reset both return to the first page. Switching stores resets the filters.
The interface supports English and Vietnamese; USD and miles stay unchanged.

The shared inventory endpoint and client accept three additional query fields:

- q: case-insensitive literal substring in product name or brand, max 120 characters.
- category: case-insensitive exact category name, max 80 characters; blank means all.
- sort: buy-score (default), profit, price-asc or price-desc. Price is clearance price;
  profit is estimated profit per unit, not inventory-adjusted store profit.

Example (use a store ID returned by /v1/stores):

```
GET /v1/stores/:id/deals?q=drill&category=tools&sort=price-asc&limit=6&offset=0
```

`getStoreInventory(id, query, signal?)` exposes these fields to Next.js and future
React Native clients. Unsupported or duplicated query keys, invalid sort values,
and oversized filters return 400. PostgreSQL uses bound search values, escapes
LIKE metacharacters, and chooses SQL ordering from a fixed list. Filtering and
sorting happen before pagination; tied values use deal ID for stable ordering.
Default BUY-score sorting uses estimated unit profit as the secondary order.

Store-level summary counts describe the whole eligible store inventory, not the
filtered page. Inventory still excludes stale, inactive and out-of-stock deals.
Pagination may shift if a retailer import changes inventory between requests.

## Yarn Classic setup and tests

Use Node 22 and Yarn 1.22.22 from the extracted repository root. Keep existing
local environment files when upgrading:

```sh
yarn install --frozen-lockfile
yarn typecheck:api
yarn test:stores
yarn build:web --webpack
```

If your PostgreSQL database has not received the earlier Phase 4.1 migration:

```sh
yarn db:migrate
yarn db:check
```

No new migration or production dependency is introduced by this step. Then run
in separate terminals:

```sh
yarn dev:api
```

```sh
yarn dev:web
```

Open http://localhost:3000/stores. For full fresh-install setup and configuration,
see PHASE4-STORES.md. The prior store activity-column fix is included.

## Validation

- 17 store/location tests passed, including literal filtering, category matching,
  invalid/duplicate parameters, all sort modes and ordering before pagination.
- API type-check and Next.js Webpack production build passed.
- Actual queries passed in embedded PostgreSQL (temporary PGlite QA runtime):
  literal product search, category matching and all four sort modes, plus the
  previous store identity, pagination, distance and stale-inventory checks.
- No new live HTTP or manual browser checks were run in this step. Standalone
  PostgreSQL deployment behavior and real retailer data remain unverified here.
