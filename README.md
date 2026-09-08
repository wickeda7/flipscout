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

## Phase 3 data provider

The shared API now owns a `DealProvider` abstraction. Web and future mobile clients
continue using the same `/v1/deals` API regardless of where deal data comes from.

Local demo mode:

```env
DATA_PROVIDER=mock
```

PostgreSQL mode:

```env
DATA_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flipscout
DATABASE_POOL_MAX=10
DATABASE_SSL=false
```

Run `database/schema.sql` against the PostgreSQL database before selecting the
PostgreSQL provider. Restart the API after changing provider settings.

`GET /health` reports `dataProvider`, provider health, and whether Mapbox is
configured without exposing credentials.

Distance is intentionally not persisted as a deal attribute in PostgreSQL yet:
store distance is user/origin-relative. The current PostgreSQL provider returns
0 miles until Phase 3 adds user-origin/geospatial distance calculation.

### PostgreSQL demo setup

After creating a PostgreSQL database, load the schema and demo data:

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```

Then configure:

```env
DATA_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flipscout
```

`GET /v1/deals` now accepts optional `lat` and `lng` query parameters. When both
are provided, PostgreSQL calculates straight-line store distance in miles using
the Haversine formula. This keeps distance relative to the caller instead of
incorrectly storing it as a permanent property of a deal.

Example:

```text
GET /v1/deals?lat=28.7589&lng=-81.3178
```

The shared API client supports the same origin through `latitude` and
`longitude`, so the future React Native client can use the same API contract.

## Database bootstrap and diagnostics

With `apps/api/.env` configured, initialize the FlipScout PostgreSQL database
directly through Yarn from the monorepo root:

```bash
yarn db:bootstrap
```

This applies both `database/schema.sql` and `database/seed.sql`. Both files are
written to be rerunnable for the current development workflow.

Verify the connection, required tables, and deal count with:

```bash
yarn db:check
```

Example successful output:

```json
{
  "ok": true,
  "database": "flipscout",
  "tables": ["deals", "stores", "user_preferences", "users", "watchlist_items"],
  "missingTables": [],
  "dealCount": 6
}
```

During development, API 500 responses now include a `detail` field containing
the underlying error message. Production responses continue to hide internal
error details.

## Shared watchlist API

Watchlist state now goes through the shared FlipScout API instead of browser
`localStorage`:

```text
GET    /v1/watchlist
POST   /v1/watchlist
DELETE /v1/watchlist/:dealId
DELETE /v1/watchlist
```

Until authentication is implemented, the API uses a stable development user:

```env
DEV_USER_ID=00000000-0000-0000-0000-000000000001
```

`database/seed.sql` creates that development user so PostgreSQL foreign-key
constraints are satisfied. Re-run:

```bash
yarn db:bootstrap
```

after upgrading to this build.

When `DATA_PROVIDER=mock`, watchlist data is held in API memory and resets when
the API restarts. When `DATA_PROVIDER=postgres`, watchlist data persists in
`watchlist_items`. The API boundary is already suitable for the future React
Native client; authentication will replace `DEV_USER_ID` later without changing
the basic watchlist resource model.

## Authentication foundation

FlipScout now includes web routes:

```text
/login
/register
```

and shared API routes:

```text
POST /v1/auth/register
POST /v1/auth/login
GET  /v1/auth/me
POST /v1/auth/logout
```

Passwords are hashed with Node's `scrypt` before storage. PostgreSQL stores only
the password hash and a SHA-256 hash of each generated session token. Raw
session tokens are returned only when a session is created.

Run the database bootstrap after upgrading:

```bash
yarn db:bootstrap
```

The web client currently persists its bearer token in browser localStorage so
the same API contract can also be consumed by the future React Native client.
Before production, the web authentication transport should be hardened to an
HttpOnly/Secure cookie or another production session strategy, while React
Native should keep credentials in platform secure storage.

Authenticated watchlist requests use the logged-in user ID. Until auth is
required everywhere, requests without a bearer token continue to use
`DEV_USER_ID` as the development fallback.

## Protected account flow

The web app now includes `/account`, and `/watchlist` redirects signed-out
users to `/login?next=/watchlist`. After a successful login, FlipScout returns
the user to the originally requested page.

Authenticated user-owned API resources reject invalid or expired bearer tokens.
For local development only, requests without a token can still use the seeded
development identity when:

```env
ALLOW_DEV_AUTH_FALLBACK=true
```

Set this to `false` when testing production-style authentication behavior.

## Account management

Authenticated users can now manage their account at `/account`.

Shared API endpoints:

```text
PATCH /v1/account/profile
POST  /v1/account/password
POST  /v1/account/logout-all
```

Changing a password verifies the current password, stores a new `scrypt` hash,
and revokes every active session for that user. The client then returns the
user to `/login`.

`POST /v1/account/logout-all` also revokes all active sessions without changing
the password. Profile updates currently support the display name; email changes
are intentionally not included yet because production email changes should be
paired with verification.

## Password recovery

FlipScout now includes:

```text
/forgot-password
/reset-password?token=...
```

Shared API endpoints:

```text
POST /v1/auth/forgot-password
POST /v1/auth/reset-password
```

Reset tokens are random 256-bit values. PostgreSQL stores only a SHA-256 hash
of the token in `password_reset_tokens`. Tokens expire after
`PASSWORD_RESET_MINUTES` (30 minutes by default), are single-use, and a
successful reset revokes every active session for that user.

For privacy, the forgot-password endpoint always returns success for a valid
email format, even when no account exists.

Until an email provider is connected, non-production API responses include a
`developmentResetUrl` only when the requested account exists. This is intended
solely for local testing. Production responses never expose the reset token.

After upgrading, apply the new table:

```bash
yarn db:bootstrap
yarn db:check
```
