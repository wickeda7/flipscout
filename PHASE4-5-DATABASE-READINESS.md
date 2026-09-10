# Phase 4.5: database readiness

Database migration, demo setup, `db:check`, and PostgreSQL API health now share a required-table/column manifest. Checks follow the connection's search_path. Migration verifies readiness before committing. Missing relations/columns encountered by API requests return HTTP 503 with code DATABASE_SCHEMA_OUTDATED and migration instructions; health reports degraded without exposing database error details.

Additive migration also fills in older store metadata columns and deals.source_updated_at. Existing inventory is preserved. Readiness checks presence, not column types, constraints, indexes or all access permissions.

## Setup

From the extracted project root, with Node 20.9+ and Yarn Classic 1.22:

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn db:check
yarn db:seed:demo
yarn db:check
yarn dev:api
```

Use your existing local API environment configuration with DATA_PROVIDER=postgres and DATABASE_URL; no credentials are included. In another terminal run `yarn dev:web`. Demo seeding is optional synthetic inventory and refreshes its timestamps. Migration alone never seeds inventory. Restart the API to load updated code.

## Tests

```sh
yarn typecheck:api
yarn test:stores
```

For the real PostgreSQL integration suite, configure TEST_DATABASE_URL to a disposable test database with schema creation permissions, then:

```sh
yarn test:postgres
```

Validated for this release: API typechecking, 18 store tests, and embedded PostgreSQL (PGlite) regression checks covering missing tables/columns, isolated search_path, repeat migration, provider health recovery, and repeat demo seeding (6 stores/48 deals). The standalone PostgreSQL integration suite was extended but was not run against a PostgreSQL server here. Web files were unchanged.
