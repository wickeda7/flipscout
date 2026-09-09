# Phase 4 validation

Base: flipscout-phase3-connectors.zip. Node 22.22.2 / Yarn Classic 1.22.22.

Passed:
- yarn typecheck:api (includes scripts and tests).
- yarn test:stores: 13 tests, covering search validation, geographic boundaries,
  radius/sorting/pagination, empty/stale inventory, manual coordinates and browser
  location success/error handling with injected geolocation callbacks.
- yarn test:connectors: 18 regression tests.
- yarn test:stores:api against a running mock API: shared client, actual HTTP
  pagination/radius search, malformed parameters, no-store cache and cancellation.
- yarn build:web --webpack: production compilation, TypeScript, all 12 static pages.
- Actual store-search SQL in embedded PostgreSQL (PGlite, temporary QA dependency
  outside the deliverable): catalog, radius/distance, empty pages with total,
  literal wildcard escaping, stores without deals, zero coordinates and inactive
  store exclusion. No production dependency was added.
- Browser checks: loaded the store catalog without assumed coordinates, entered
  sample Lake Mary coordinates, verified distance sorting and selected a store;
  the trip planner received the same origin and produced a local route estimate.
- Root scripts and guides use Yarn, with no npm run/install commands remaining.
- Archive integrity, dependency protocol and generated-file exclusions checked.

Limitations:
- Default Turbopack build hit the local execution environment's child-process
  port-binding restriction. Webpack production build passed instead.
- Standalone PostgreSQL integration tests were type-checked but not executed.
  The embedded PostgreSQL SQL checks do not validate remote connections,
  concurrency, pooling or production performance.
- A real device location permission was not requested; permission/error behavior
  was tested with injected callbacks and manual coordinates in the browser.
- EN/VI translations are type-checked for matching keys. Currency and distances
  remain USD and miles. No external geocoder or real retailer service was called.
- No Mapbox credentials were used; live road routing/map rendering is unverified.

See PHASE4-STORES.md for exact setup and test commands.
