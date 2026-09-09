# Phase 4.2 validation

Executed on the retained Phase 4.1 working copy:

- 15 store/location tests passed, including inventory isolation, stable pagination,
  unavailable-record exclusion, unknown stores, query validation and origin distance.
  The test file was run with Node's test runner and the installed tsx loader.
- yarn typecheck:api passed.
- yarn build:web --webpack passed, including TypeScript and all 12 static pages.
- Embedded PostgreSQL (temporary PGlite runtime outside the deliverable) executed
  the actual inventory and store-summary SQL: identity, limit, origin distance,
  unknown-store 404 and stale-data exclusion passed.
- ZIP integrity and generated-file exclusions checked.

The new inventory UI was compiled but not manually browser-tested in this step.
The updated live API smoke test is provided for yarn test:stores:api, but was not
run against a live API in this step. Standalone PostgreSQL, retailer services and
real device geolocation were not used. Prior Phase 4.1 migration fixes remain.
