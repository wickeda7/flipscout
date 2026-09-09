# Mock inventory update

The in-memory demo now contains 48 deals across six stores: eight per store,
with Tools, Electronics, Home and Kitchen categories. Additional items are
explicitly synthetic, named Demo and branded Demo Brand. All records use source
mock. The original six examples remain; this is not live retailer availability.

## In-memory mock mode (your configuration)

In apps/api/.env:

```env
DATA_PROVIDER=mock
PORT=4000
```

In apps/web/.env.local:

```env
NEXT_PUBLIC_FLIPSCOUT_API_URL=http://localhost:4000
```

Stop the old API and web processes. From this extracted repository root:

```sh
yarn install --frozen-lockfile
yarn dev:api
```

In another terminal:

```sh
yarn dev:web
```

Open http://localhost:3000/stores, clear location/text filters if necessary,
and click View store deals. No database, migration or seed command is needed
in mock mode. If running a production web server, rebuild after changing the
NEXT_PUBLIC API address, using `yarn build:web --webpack`, before restarting it.

Check the running API rather than relying only on the .env file: an exported
shell variable can override .env, or an old process may still own port 4000.

```sh
curl http://localhost:4000/health
curl 'http://localhost:4000/v1/stores?limit=12'
yarn test:stores:api
```

Health should say dataProvider mock. The store response should contain six
stores. With the default freshness threshold, each has activeDealCount 8.
The API smoke command verifies store inventory through the shared client too.
The empty response reported in the previous build was not reproduced locally;
if it persists, the response body and the API base URL are needed to diagnose
the actual running environment.

## Optional PostgreSQL demo data

For DATA_PROVIDER=postgres only, configure DATABASE_URL, then:

```sh
yarn db:migrate
yarn db:seed:demo
yarn db:check
```

The new seed command loads the same 48 demo deals using fixed demo IDs. Reruns
refresh timestamps and reactivate those mock records, without creating accounts
or changing records from other sources. Existing mock records with those IDs are
updated. No records are deleted. The seed does not populate ingestion run history.
PostgreSQL demo data still expires under the normal freshness rules; rerun the
seed to refresh it. The older mock retailer adapter is a separate ingestion
fixture; running a full mock ingestion can deactivate other source-mock records.

## Validation

- 18 store/location tests passed, including eight deals per store, two inventory
  pages, four categories, and prior search/sort/availability behavior.
- API type-check passed.
- Live mock HTTP/shared-client smoke checks passed against a temporary test API.
- Optional seed SQL passed in embedded PostgreSQL: six stores, 48 deals, idempotent
  rerun, timestamp refresh/reactivation and no user-account insertion.
- No web UI source changed in this update; the web build was not repeated.
