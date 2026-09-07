# FlipScout shared platform foundation

This build is the architecture checkpoint before Phase 3.

## Platform layout

```text
apps/
  web/       Next.js Round 1 client
  api/       standalone shared FlipScout API
  mobile/    Round 2 React Native / Expo boundary

packages/
  types/       shared API/domain contracts
  core/        shared profit + BUY score calculations
  api-client/  framework-neutral API client
  i18n/        English + Vietnamese UI dictionaries

database/
  schema.sql   shared PostgreSQL schema contract
```

The web client and future mobile client are peers. Neither client is the
backend. Both consume the same FlipScout API and database-backed services.

## Local development

From the repository root:

```bash
npm install
```

Create `apps/api/.env` from `apps/api/.env.example`.

Create `apps/web/.env.local` from `apps/web/.env.example`.

Run the API in terminal 1:

```bash
npm run dev:api
```

Run the web app in terminal 2:

```bash
npm run dev:web
```

Defaults:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `GET /health`
- Deals: `GET /v1/deals`
- Deal detail: `GET /v1/deals/:id`
- Routing: `POST /v1/routes/optimize`

## Internationalization rule

The shared i18n package currently supports `en` and `vi`.

Only application/UI language is localized. FlipScout intentionally does not
change currency, miles/measurement units, dates, numeric conventions, retailer
data, product names, SKUs, UPCs, or other product/source data when the language
changes.

The web sidebar includes an EN / VI switch and persists the choice locally.
The dashboard and primary navigation are wired to the shared dictionary in this
foundation pass. Remaining screen copy can be migrated to translation keys
incrementally without changing the architecture.

When accounts are introduced, `user_preferences.locale` is the database field
for synchronizing the language preference between web and mobile.

## Phase 3 boundary

Phase 3 should replace the API's mock deal provider with real provider/database
implementations. It should not add authoritative retailer or user APIs back into
Next.js routes.

The PostgreSQL schema in `database/schema.sql` is a starting contract, not a
migration history or a production-ready database deployment.

## Yarn Classic support

This build is compatible with Yarn Classic 1.x. Internal FlipScout workspace
dependencies use matching local package versions such as `0.1.0` instead of
the newer `workspace:*` protocol.

From the repository root:

```bash
yarn install
```

Then run:

```bash
yarn dev:api
```

and in another terminal:

```bash
yarn dev:web
```

Yarn resolves `@flipscout/types`, `@flipscout/core`,
`@flipscout/api-client`, and `@flipscout/i18n` from the local workspaces.
Do not run `yarn install` from inside `apps/web` or `apps/api`; run it at the
repository root.

### API environment loading

The standalone API loads `apps/api/.env` via `dotenv`. After changing the file,
restart `yarn dev:api`.

You can verify the API sees the Mapbox token by opening:

```text
http://localhost:4000/health
```

The response should include:

```json
{"ok":true,"mapboxConfigured":true}
```

The token value itself is never returned.
