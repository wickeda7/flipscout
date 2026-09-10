# Combined discovery validation

The Find deals page now includes an expandable Search details panel showing
how many product groups completed and the number of products checked in each.
It does not reintroduce category selection. Failed groups say Could not check,
rather than reporting a successful zero-result scan.

The shared API includes per-group status, checked-product count, provider
timestamp and safe failure code. Raw provider errors and credentials are not
returned. A missing store name cannot establish local stock even when a
quantity and zero distance are present.

## Setup

Preserve your existing apps/api/.env and web environment file when upgrading.

```sh
yarn install --frozen-lockfile
yarn dev:api
```

In another terminal:

```sh
yarn dev:web
```

No new environment values or database migrations are required.

## Checks

```sh
yarn test:discovery
yarn typecheck:api
yarn build:web --webpack
```

All 31 discovery/location/settings tests, API typecheck and production build
passed for this update.

To validate the real combined search from the command line:

```sh
yarn check:discovery:scan
```

This command requests five product groups for East Brandon #6305, ZIP 33511,
25 miles, first page, all deal types. It can consume up to five provider credits.
At most two requests run concurrently. Existing failure cooldowns apply and no
automatic retries run. The process can take several minutes.
Exit status: 0 complete, 2 partial, 1 failed. JSON contains normalized results.
The smaller yarn check:discovery command still checks only one group.

Neither command seeds a database or changes existing inventory. Wider retailer
connections, additional stores, penny coverage and persistent observations
remain outstanding.

## Live result — September 10, 2026

The combined run completed in 166.475 seconds with exit status 2 (partial):
2 of 5 groups completed, 48 product rows checked, 9 unique reported sales.
The other 3 groups could not be checked. No retry was performed.

Completion time: 2026-09-10T14:09:45.070Z.
Oldest provider timestamp among successful groups: 2026-09-10T14:06:59Z.
Pickup classifications among the nine sale records: 3 local reports,
1 ship-to-store offer, and 5 unknown. These are provider observations,
not guarantees of price or stock when arriving at the store.

This run used the pre-panel response schema and therefore records aggregate
coverage counts but not the newly added per-group diagnostics. Per-group
reporting was verified with automated tests; it will appear on subsequent runs.

The earlier single-group success remains valid evidence. This combined check
shows partial live discovery works, but full five-group reliability is still
unresolved. No clearance labels or penny prices were returned in the successful
portion; that is not evidence that the unchecked inventory has none.
