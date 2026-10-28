# Target discovery

Target now routes to SerpApi engine=target, q=<department> clearance, store_id=812, delivery_zip=<requested ZIP>, page=<requested page>. Official store listing: https://www.target.com/sl/brandon/812. API documentation: https://serpapi.com/target-search-api.

Each page combines six searches: home, electronics, toys, outdoor, clothing, and beauty. Duplicate TCINs are merged and partial failures are reported.

This initial integration covers Brandon #812 only, up to 25 miles measured between ZIP-area centroids, not exact store coordinates. Other areas show no connected coverage without making a paid search. It does not scan every Target store or every clearance product. Google Shopping cache entries are bypassed by a new Target cache version. Existing 12-hour PostgreSQL cache and client-side filtering/sorting remain unchanged.

A result needs an exact dollar price matching its numeric price and either a comparison price, explicit Clearance tag, or one-cent price. Price ranges are excluded. Direct target.com links must match TCIN or parent TCIN plus the selected variant. Search data is not an independent product-detail verification or a guarantee of local checkout prices. Price notes are shown, quantities remain unknown, and no default Iowa store is used. Images use Target's scene7 host through Next Image.

No new secrets or database tables. Existing SERPAPI_API_KEY and DATABASE_URL are required. Copy the release into your project without replacing your .env, commit and push to the Render-connected branch; deploy both API and web services.

```sh
yarn install --frozen-lockfile
yarn test:target
yarn test:shopping
yarn typecheck:api
yarn build:web --webpack
```

Optional paid live check and database reuse check:

```sh
yarn check:retailers target 33511
```

Test URL: /v1/discovery?retailer=target&zip=33511&radiusMiles=25&page=1

Validation: 12 Target/shopping tests passed; API typecheck and web production build passed. One live SerpApi Target search for store 812 / ZIP 33511 returned 27 products and 11 accepted deals. This confirms search integration, not checkout prices.
