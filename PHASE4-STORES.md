## Phase 4.1: existing-database fix

The original Phase 4 archive missed an upgrade step for `stores.is_active`. This can cause a 500 response on store search in older databases. Run `yarn db:migrate`, then `yarn db:check` and restart the API. The migration does not apply seed data.

# Phase 4 — geolocation and store search

Built on `flipscout-phase3-connectors.zip`. All root scripts use Yarn Classic
workspace commands. No npm workspace commands or workspace protocol dependencies
are needed. There are no new production dependencies. Existing databases must run the schema migration below to add the store activity flag.

## Start with Yarn Classic

Use Node 22 and Yarn 1.22.22. From the extracted `flipscout` directory:

```sh
yarn install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
yarn typecheck:api
yarn test:stores
yarn test:connectors
yarn build:web --webpack
```

The normal `yarn build:web` command uses Next's default Turbopack builder. The
Webpack option above is the production build verified for this delivery; it avoids
a local execution-environment restriction on Turbopack's child-process port binding.
Neither build command calls npm.

For a demo, leave DATA_PROVIDER=mock in the API environment file. Start the API:

```sh
yarn dev:api
```

In a second terminal from the repository root:

```sh
yarn dev:web
```

Open `http://localhost:3000/stores`. If your environment also restricts Turbopack
in development, use `yarn dev:web --webpack`.

Root scripts are:

```json
{
  "dev:web": "yarn workspace @flipscout/web dev",
  "dev:api": "yarn workspace @flipscout/api dev",
  "build:web": "yarn workspace @flipscout/web build",
  "typecheck:api": "yarn workspace @flipscout/api typecheck"
}
```

Keep your existing local environment files when upgrading. The copy commands are
for a fresh extraction. All credentials remain in local environment files or your
secret manager; only blank/example environment files are packaged.

## Store search

The Stores page now searches a dedicated store catalog rather than grouping all
deals in the browser. It supports name/city/state text search, retailer and source
filters, radius selection, nearest/name sorting and paginated results. Stores
without recent in-stock deals remain visible. Mock data is explicitly labeled.

“Use my location” requests a single browser location fix only on click. HTTPS
(or localhost) is needed for browser geolocation. Denied, unavailable, timed-out,
unsupported and invalid location states have English and Vietnamese messages.
Users can search by text without location permission or enter coordinates
manually. Latitude and longitude zero are valid. No location is silently assumed.
Coordinates stay in page state and are sent with search requests; they are not
saved to the account, local storage or the database. Reloading clears them.

City search matches catalog text; it does not geocode arbitrary addresses or ZIP
codes. No paid geocoder or third-party location lookup was introduced. Distances
are great-circle miles, clearly labeled as straight-line distances. They are null
in the API when no origin is supplied. Language switching does not change units,
currency, origin or search radius.

Set a location and add up to 10 stores to a trip. The existing trip planner starts
from that location and uses the selected stores' current summary data. Selection
survives changing result pages. Changing or clearing the search origin clears the
trip to prevent stale distances. Existing optional Mapbox road routing remains
available; local estimates work without a Mapbox token. Maps use the existing
public map token, and road routing uses the existing server token. Location and
selected stops are shared with Mapbox when those optional features are used.
Map setup details belong in configuration, not end-user error messages.

## Shared API

`GET /v1/stores` is available in both mock and PostgreSQL modes:

```sh
curl 'http://localhost:4000/v1/stores?q=Lake%20Mary&limit=12&offset=0'
curl 'http://localhost:4000/v1/stores?lat=28.7855&lng=-81.3572&radiusMiles=25&sort=distance'
```

| Query | Behavior |
| --- | --- |
| q | Literal case-insensitive substring in store name, retailer, city or state; max 120 characters |
| retailer | Case-insensitive exact retailer name; max 80 characters |
| source | Exact ingestion source slug; max 64 characters |
| lat, lng | Must be supplied together; −90…90 and −180…180 |
| radiusMiles | Optional 0.1…500; requires coordinates |
| sort | name or distance; distance requires coordinates; default is distance with an origin, name otherwise |
| limit | Integer 1…100; default 12 |
| offset | Integer 0…10000; default 0 |

Malformed parameters, duplicate keys and unknown keys return HTTP 400 with code
INVALID_STORE_QUERY. Queries are parameterized; literal `%`, `_` and backslash
characters are escaped for PostgreSQL text search. Distances are clamped safely
at antipodes and geographic boundaries. Results are ordered with a stable store-ID
tiebreaker, and total counts remain available on empty pages. Pagination beyond
the 10,000 offset cap requires narrowing the search.

The shared `FlipScoutApiClient.searchStores(query, signal?)` returns
`StoreSearchResponse`: stores, total, limit, offset, hasMore, and dataProvider.
Each store has a stable ID, source, name, retailer, city/state, coordinates,
nullable distance and opportunity counts. The client supports cancellation;
the web page cancels superseded requests and prevents old responses from
replacing newer results. The future React Native app can call the same endpoint
with coordinates from its own permission flow. No web-only backend was added.

PostgreSQL searches the stores table directly and aggregates opportunity data only
for the returned page. Deal counts/profit include active, in-stock records whose
source timestamp is within INGESTION_STALE_AFTER_MINUTES (default 180). Old,
inactive or out-of-stock deals are excluded from summaries. These are reported
observations, not a guarantee of current retailer availability. Store catalog
coverage is limited to configured ingestion sources. Search currently uses
ordinary PostgreSQL without PostGIS; large catalogs may need spatial/text indexes
and a different pagination strategy after performance measurement.

## PostgreSQL and live checks

For persistent data set DATABASE_URL and DATA_PROVIDER=postgres in apps/api/.env.
For a fresh development database:

```sh
yarn db:bootstrap
yarn db:check
yarn ingest:retailer mock
```

For an existing database, apply the schema upgrade without loading seed data:

```sh
yarn db:migrate
yarn db:check
```

Restart the API. The migration adds `stores.is_active` if missing and preserves existing data. Bootstrap includes the
existing mock seed; it is not needed on every startup. See PHASE3-CONNECTORS.md
for importing an authorized retailer source.

With the mock API running, test the real HTTP endpoint and shared client:

```sh
yarn test:stores:api
```

For another test API address:

```sh
TEST_API_URL=http://localhost:4104 yarn test:stores:api
```

For the opt-in PostgreSQL integration suite, set TEST_DATABASE_URL to a disposable
PostgreSQL database in your shell, then run:

```sh
yarn test:postgres
```

The suite creates/removes its own schema and needs CREATE SCHEMA rights. Phase 4
adds store radius, summary and empty-page assertions to the existing ingestion
suite. VALIDATION.md separates the tests executed here from checks requiring a
standalone PostgreSQL server or a real device location permission flow.
