# Home Depot pilot: East Brandon, ZIP 33511

This checkpoint adds a read-only SerpApi probe for store 6305. It is not yet an inventory importer or full-store scanner. No live request was executed in this workspace because SERPAPI_API_KEY was not present in its environment file.

With Node 20.9+ and Yarn Classic, from the project root:

```sh
yarn install --frozen-lockfile
yarn typecheck:api
yarn test:home-depot
yarn check:home-depot 326290517
```

Set SERPAPI_API_KEY in apps/api/.env before the last command. The product ID above is a documented provider example, not a known local clearance item. The probe accepts 1–5 unique nine-digit Home Depot product IDs. Use product IDs from product-page URLs, not retailer SKUs or UPCs. Each ID can consume a provider query credit. The command makes one request per product, stops on the first failure, rejects redirects, caps each response at 2 MB and times out after 45 seconds. It uses the provider's default cache behavior. No automatic retries or scheduled queries.

For an environment file in another checkout:

```sh
FLIPSCOUT_ENV_FILE='/absolute/path/to/apps/api/.env' yarn check:home-depot 326290517
```

Output includes requested store/ZIP, reported product price, explicitly labeled Store Pickup quantity, provider creation time and fetch time. Provider processing time is not retailer observation time. Delivery quantities never become store stock. Unknown quantities remain null. A $0.01 price is only a candidate until checked in store; clearance is not marked verified. Raw responses, provider URLs with keys and arbitrary provider error bodies are not printed. No PostgreSQL writes occur.

Validated: six fixture tests and API typecheck. Live access, store fulfillment identity, local-versus-online pricing and penny coverage remain unverified. Next: run one baseline product, inspect result, then test known local clearance examples before implementing persistent observations.

Provider contract: https://serpapi.com/home-depot-product
Store reference: https://www.homedepot.com/l/East-Brandon/FL/Brandon/33511/6305

## Live Playground validation

A later Playground test returned Success for product 326290517, store 6305, ZIP 33511. Search 6aa1e33f5922f472014fc339, provider timestamp 2026-09-09T22:52:47Z, duration 16.79 seconds. It reported the Milwaukee 3017-20 blower at $149 (Special-Buy, original $199), with 21 units under Store Pickup at East Brandon. This validates one provider response through the Playground, not the full API-to-database ingestion path or penny coverage. No inventory was imported. The earlier failed request remains unresolved.
