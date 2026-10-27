# Home Depot product verification

Discovery now uses SerpApi home_depot search followed by home_depot_product checks for qualifying candidates. Product ID, requested store and delivery ZIP must match. Displayed prices and comparison prices come from product details (promotion.original); old search badges are not proof of a current discount. Unconfirmed markdowns are omitted. One-cent prices remain penny candidates requiring register confirmation. Links use https://www.homedepot.com/p/PRODUCT_ID.

Coverage remains East Brandon store #6305, delivery ZIP 33511, within the chosen radius of the existing store coordinates. This does not add nationwide store discovery. Search still combines five category groups internally; the UI has no category selector. It is not a complete inventory feed. Pickup availability is only reported when the fulfillment store name matches; no shelf quantity is inferred. The provider echoes request context, which is not independent proof of a local checkout price. Product verification time is when FlipScout processed the provider response, which may itself be cached.

Up to 40 unique candidates receive detail checks, with four concurrent requests and a four-minute queue deadline. In-flight calls can take another 105 seconds. Omitted/failed checks appear as partial verification coverage. Total failure throws and is not cached as empty. Up to five search requests plus 40 product requests may be used per cold scan. Filters and sorting make no provider requests. The existing 12-hour PostgreSQL cache remains; a new Home Depot cache version bypasses unverified prior results. Existing .env settings remain valid.

Setup from the project root with Yarn Classic and Node 22:

```sh
yarn install --frozen-lockfile
yarn db:migrate
yarn test:home-depot
yarn test:discovery
yarn test:discovery:cache
yarn typecheck:api
yarn build:web --webpack
```

Run `yarn dev:api` and `yarn dev:web` in separate terminals. Test with:

http://localhost:4000/v1/discovery?retailer=home-depot&zip=33511&radiusMiles=25&page=1

Optional paid live scan and database cache-reuse check:

```sh
yarn check:retailers home-depot 33511
```

Provider documentation: https://serpapi.com/home-depot-product

Validation for this update uses mocked provider responses and regression tests; no new live Home Depot request is claimed.

## Image quality fix

Search results now select the largest supplied rendition of the primary thumbnail. Verified products prefer the largest supplied primary product image, falling back to the search image when unavailable. URLs are selected from provider data, not synthesized. Existing cached results retain their old image URL until the 12-hour entry expires; no paid refresh is forced by this update. Restart the API after replacing the source files. The web image optimizer remains enabled.

Validation: 37 Home Depot/discovery tests passed and API typecheck passed. No new live provider calls were needed for this change.
