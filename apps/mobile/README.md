# FlipScout Mobile

Round 2 will add the React Native / Expo client here.

The mobile client must consume the same standalone FlipScout API as the web
client and reuse the shared workspace packages where appropriate:

- `@flipscout/types`
- `@flipscout/api-client`
- `@flipscout/core`
- `@flipscout/i18n`

Do not duplicate authoritative deal, scoring, profit, watchlist, or routing
business logic inside the mobile app.
