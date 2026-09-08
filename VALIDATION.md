# Validation for Phase 3 connectors

Executed with Node 22.22.2 and Yarn Classic 1.22.22:

- `yarn install --non-interactive`: passed; generated and included yarn.lock.
- `yarn typecheck:api`: passed, including ingestion code, scripts and tests.
- `yarn test:connectors`: 18 tests passed, zero failures or skips.
- `yarn build:web`: passed, including TypeScript and all 12 prerendered pages.
- `RETAILER_SOURCES_FILE=config/retailer-sources.example.json yarn ingest:check`:
  passed; example reported disabled without network or database calls.
- Package dependency check: no `workspace:*` protocols.
- Original archive comparison: existing database schema, shared API client,
  EN/VI translations, scoring implementation and mobile scaffold preserved.
- Archive integrity and exclusion checks performed during packaging.

The connector suite uses a real local HTTP server for successful requests,
timeouts and redirects. Other HTTP cases use injected responses. Database
transaction/audit/scheduler assertions use query doubles; they do not prove
PostgreSQL SQL execution or cross-process lock behavior.

Live PostgreSQL validation was attempted but cluster initialization was blocked
by the execution environment (`shmget: Operation not permitted`). The separate
`yarn test:postgres` test was type-checked but not executed. Run it against a
disposable PostgreSQL database with TEST_DATABASE_URL before production use.
No real retailer service, credentials, production database or scheduled service
was used. No scheduler has been installed by this delivery.

Compatibility fixes included: API TypeScript resolution matches the tsx runtime;
health-check response gets an explicit type; login and registration have Suspense
boundaries for search parameters. Next generated its current TypeScript settings
and next-env declarations during the successful build.
