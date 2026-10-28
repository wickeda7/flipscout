# Dollar General

The existing SerpApi Google Shopping connector searches household, beauty, toys, clothing, food and seasonal offers. This release adds DG-specific EN/VI coverage guidance, official sales/weekly-ad/app links, and regression coverage for the six-query scan, merchant exclusion, direct links and shared cache.

No documented public DG inventory API or dedicated SerpApi DG engine was identified in the documentation reviewed on October 27, 2026. This release does not add a direct DG API. Prices and penny candidates are provider-reported online offers, not verified local checkout prices. Coupons and cash back are not subtracted from prices. Zero results do not mean a store has no deals.

Official resources:
- https://www.dollargeneral.com/c/on-sale
- https://www.dollargeneral.com/deals/weekly-ads
- https://www.dollargeneral.com/app

No new environment variables or migrations. Keep existing DATABASE_URL and SERPAPI_API_KEY. Cache duration remains 12 hours, with filters and sorting applied locally. Up to six provider searches per uncached scan. No paid live scan was performed for this release.

```sh
yarn install --frozen-lockfile
yarn test:shopping
yarn typecheck:api
yarn build:web --webpack
```

Copy into the project preserving .env, commit and push, then deploy both Render services. This archive has not been deployed.
