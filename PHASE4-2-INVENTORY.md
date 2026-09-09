# Phase 4.2 — store inventory

Built on the Phase 4.1 migration fix. Stores now have a “View store deals” action.
The inventory panel shows recent in-stock deals ranked by BUY score, with stable
pagination, retry/empty/not-found states and English/Vietnamese text. Existing
deal cards retain product-detail links and watchlist actions. Unknown distances
are not displayed as zero; supplied origins are used for distance calculations.
Changing the search origin closes the inventory view. Closing/changing stores
cancels pending requests and prevents old results from replacing the current view.

The shared API adds:

```
GET /v1/stores/:id/deals?limit=6&offset=0
GET /v1/stores/:id/deals?lat=28.7855&lng=-81.3572&limit=6&offset=0
```

Use the ID returned by `/v1/stores`. Unknown or inactive stores return 404 with
STORE_NOT_FOUND. Malformed coordinates/pagination return 400. Supported query
parameters are lat, lng, limit (1–100), and offset (0–10000). Both coordinates must
be supplied together. The response contains store, deals, limit, offset and
hasMore. The backend fetches only one extra record to determine hasMore rather
than loading all inventory into the browser. Ordering uses score, profit and ID.
As inventory changes, offset pages can shift; this is not a frozen feed snapshot.

The shared client method is `getStoreInventory(id, query?, signal?)`. It is usable
by the future React Native app as well as Next.js. Inventory respects the same
INGESTION_STALE_AFTER_MINUTES threshold as store summaries, excluding inactive,
out-of-stock and old deals. Counts and inventory use separate reads, so concurrent
imports can change them between queries. Availability must still be confirmed.

## Yarn Classic setup

Keep your local environment files and use Node 22 / Yarn Classic 1.22.22. From
the extracted repository root:

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn db:check
yarn typecheck:api
yarn test:stores
yarn build:web --webpack
```

The database commands apply to PostgreSQL mode; skip them for DATA_PROVIDER=mock.
This step adds no schema changes beyond the retained Phase 4.1 fix. db:migrate
remains idempotent and does not seed data.

In separate terminals:

```sh
yarn dev:api
```

```sh
yarn dev:web
```

Open http://localhost:3000/stores and choose “View store deals”. If your local
runtime restricts Turbopack, use `yarn dev:web --webpack`.

With the updated mock API running, the shared-client HTTP smoke check is:

```sh
yarn test:stores:api
```

For a fresh installation and optional retailer connectors, follow PHASE4-STORES.md
and PHASE3-CONNECTORS.md. All scripts use Yarn; no npm workspace commands or new
production dependencies were introduced.
