# DealDiscovery effect fix

Replace apps/web/src/components/discovery/DealDiscovery.tsx in your existing checkout, or use this complete ZIP. No database or environment changes are needed.

Saved settings initialize when the browser form mounts, using a hydration-safe loading placeholder. Search/retry/pagination handlers set loading and error state. Share feedback is derived from the copied settings. Effects retain storage/URL synchronization and cancellable asynchronous search callbacks. Local filters and sorting remain request-free.

Validation: targeted ESLint reports zero errors (one existing image-optimization warning); seven saved-settings tests and the production web build passed. No live retailer calls were needed.

From the project root:

```sh
yarn workspace @flipscout/web exec eslint src/components/discovery/DealDiscovery.tsx
yarn build:web --webpack
yarn dev:web
```
