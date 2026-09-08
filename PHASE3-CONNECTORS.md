# Phase 3: configurable retailer connectors

Base: `flipscout-phase3-observability.zip`. This adds a backend-only HTTP/JSON
adapter to the existing RetailerAdapter → shared normalization/profit scoring →
PostgreSQL flow. Next.js and the future React Native app continue to consume the
same API. EN/VI language-only behavior is preserved. No retailer API is invented.

## Setup and tests

Use Node 22 and Yarn Classic 1.22.22. From the extracted `flipscout` directory:

```sh
yarn install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/api/config/retailer-sources.example.json apps/api/config/retailer-sources.json
yarn typecheck:api
yarn test:connectors
yarn build:web
yarn ingest:check
```

The example source is disabled and its `.invalid` hostname cannot serve a real
feed. `ingest:check` without a source validates configuration and reports
`disabled`, `missing-credential`, or `ready`; it makes no HTTP or database calls.
An enabled source missing credentials causes exit code 1. “Ready” means locally
configured, not independently verified or authorized.

Set DATABASE_URL in `apps/api/.env` to your PostgreSQL database and set
DATA_PROVIDER=postgres to display persisted deals. Then:

```sh
yarn db:bootstrap
yarn db:check
yarn ingest:retailer mock
yarn dev:api
```

In another terminal, from the same directory:

```sh
yarn dev:web
```

There is no schema migration in this step. Bootstrap also applies the existing
mock seed; use it for initial/local setup, not as a recurring ingestion command.

## Connect an authorized feed

Edit `apps/api/config/retailer-sources.json`. Obtain endpoints, field definitions,
pagination semantics, credentials and permission from the data provider. The
configuration is operator-owned; do not accept it from public API requests.

Use one stable lowercase source slug per independent inventory namespace.
`mock` is reserved. Different partial store scopes should have distinct source
slugs, or always remain partial imports. Custom source strings are supported by
the shared types and existing TEXT database columns.

Replace both HTTPS URLs with authorized store and inventory endpoints, adjust
mappings, and set `enabled` to true. No scraping, browser login automation,
retailer-specific headers or guessed endpoint paths are included. For public
feeds remove `auth`. For authenticated feeds supply the named environment variable
through your deployment secret manager or local untracked `.env`; configuration
stores only the variable name. Never put credentials in URL query parameters or
mapping constants. Redirects are rejected; configure the final approved URL.
HTTP is allowed only for explicit loopback hosts outside production.

Each endpoint specifies an `itemsPath` (dot-separated object keys; empty string
means a root array) and a `mapping` from normalized field name to a rule:

```json
{
  "externalDealId": { "path": "product.id", "type": "string" },
  "clearancePrice": { "path": "price.cents", "type": "number", "scale": 0.01 },
  "category": { "value": "Tools", "type": "string" },
  "sourceUpdatedAt": { "path": "updatedAt", "type": "date" }
}
```

Rules use exactly one of `path` or constant `value`. Numeric strings convert
strictly with Number; there is no currency-symbol or locale parsing. IDs supplied
as strings retain leading zeros; providers must send large IDs as strings.
Dates must be ISO timestamps with timezone. Mapping does not evaluate expressions.
All required store/deal fields appear in the example. Optional deal fields are
`resalePrice`, `marketplaceFeePercent`, `shippingCost`, `otherCosts`, `sourceUrl`,
`sku`, and `upc`. Omit an optional mapping to use the existing scoring defaults;
if configured, it must resolve on every record. Missing/invalid records abort the
entire import. Each deal must reference a store in this batch, and duplicate keys
are rejected. Store and deal endpoints can point to the same response with
separate item paths; each is fetched independently.

Pagination modes:

| Mode | Configuration | Completion condition |
| --- | --- | --- |
| Single response | `{"mode":"none"}` | One successfully parsed response |
| Page number | `{"mode":"page","param":"page","sizeParam":"limit","pageSize":100,"start":1}` | Fewer than pageSize items; an exact-size final page requires a subsequent empty page |
| Cursor | `{"mode":"cursor","param":"cursor","nextPath":"nextCursor"}` | Explicit null or empty-string next cursor |

Cursors are opaque query values, never navigation URLs. A missing cursor,
repeated cursor, record limit or page limit fails the fetch. Set page mode only
if the provider guarantees its short-page completion semantics. `maxPages` is
per endpoint; `maxRecords` is shared across stores and deals. Stores and deals
are collected in memory before any writes; there is no streaming checkpoint.

`timeoutMs` covers each request including body consumption. Requests retry network
errors, timeouts, 429, 500, 502, 503 and 504 with bounded exponential delay/jitter.
`retries` counts additional attempts. Retry-After seconds and HTTP dates are
honored up to 30 seconds; longer values fail the run for later scheduling.
Other HTTP errors, malformed JSON, bad mappings and oversized bodies do not retry.
The source limits and defaults are shown in the example JSON.

Validate the real feed without writing inventory:

```sh
yarn ingest:check authorized-feed
```

Replace `authorized-feed` with your configured source slug if changed. This
performs GET requests for all configured pages and prints only counts, timing,
request/retry totals and a diagnostic code. It does not print payloads, endpoint
URLs or credentials and does not create ingestion history. After it succeeds:

```sh
yarn ingest:retailer authorized-feed
```

## Snapshot safety

`fullSnapshot` defaults to false. Enable it only when BOTH endpoints cover the
complete source namespace with consistent provider snapshot semantics. The
framework cannot prove provider-side completeness or stabilize a changing feed.
A complete run deactivates deals absent from the exact set of persisted store/deal
keys; it does not rely on wall-clock comparisons. An empty full snapshot also
requires `allowEmptySnapshot: true`. Every record is validated before persistence;
SQL errors roll back the entire transaction and snapshot cleanup. Partial imports
never deactivate missing deals. Stores themselves are not deactivated.

## Scheduling and diagnostics

```sh
yarn ingest:due
```

This is a one-shot worker, not a resident scheduler. Configure your deployment's
scheduler to run that command every minute from the repository root with the same
environment as manual ingestion. It processes enabled sources sequentially and
continues after one source fails. A source is due when no completed or failed run
ended within its `intervalMinutes`; failures therefore also back off until that
interval. Manual `ingest:retailer` bypasses the interval, but respects the lock.

A PostgreSQL advisory lock covers fetch through commit and prevents overlapping
runs of the same source across these workers. Use direct connections or session
pooling, not transaction-mode PgBouncer. Ingestion uses two pool connections;
custom callers must also allow at least two and use `runSource`. Calling the
low-level `ingestRetailerBatch` directly does not acquire the scheduler lock.
Connection and SQL timeouts are configured in the CLI. A process killed before
completion releases its database lock but may not write a failure audit; external
scheduler monitoring remains necessary. There is no checkpoint/resume queue.

Fetch failures now appear as failed runs through existing `/v1/ingestion/runs`
and `/v1/ingestion/status`, so existing source freshness can become stale. Stored
errors are safe codes; detailed request/page counters remain CLI diagnostics.
A disabled or never-run source is visible in `ingest:check`, not the existing
database-backed dashboard until it has data/history. No public ingestion or
configuration mutation endpoint was added.

## Validation scope

`yarn test:connectors` exercises normalization, strict config, credential readiness,
pagination, loop/limit protection, retries, timeout/redirect behavior against a
local HTTP server, snapshot protection, failure auditing, scheduler decisions and
transaction control using database doubles. `yarn typecheck:api` also covers
scripts and tests. The API uses TypeScript bundler resolution to match its tsx
runtime and the source-based shared packages. Existing auth pages receive Suspense
boundaries for search parameters so Next's production prerender can complete.

For a real PostgreSQL test, provision a disposable database and set
TEST_DATABASE_URL in your shell, then run:

```sh
yarn test:postgres
```

This test creates and removes a unique schema and requires CREATE SCHEMA rights.
It checks idempotent upserts, partial/full snapshot behavior, SQL rollback,
failure history, advisory locking and due scheduling. It must use a direct
connection and should target a dedicated test database. No retailer credentials
are needed. It is separate from the default suite; consult VALIDATION.md for
which checks were actually executed for this archive.
