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

## Email verification

New accounts now enter an email-verification flow at:

```text
/verify-email
```

Shared API endpoints:

```text
POST /v1/auth/verify-email
POST /v1/auth/resend-verification
```

The `users` table now includes `email_verified_at`, and one-time verification
tokens are stored in `email_verification_tokens`. Only a SHA-256 hash of each
verification token is stored. Tokens expire after `EMAIL_VERIFICATION_HOURS`
(24 hours by default).

Registration creates a verification request automatically. In development,
the API can return a `developmentVerificationUrl` so the complete flow is
testable before an email delivery provider is connected. Production responses
do not expose verification tokens.

The Account page displays whether the current email address has been verified
and links unverified users back to the verification flow.

After upgrading:

```bash
yarn install
yarn db:bootstrap
yarn db:check
```

## Transactional email

FlipScout now has a backend email-provider abstraction used by both email
verification and password recovery.

Supported providers:

```text
console  Local development only. Prints the generated URL to the API console.
resend   Sends real transactional email through the Resend REST API.
```

Local development:

```env
EMAIL_PROVIDER=console
WEB_APP_URL=http://localhost:3000
```

Resend:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=FlipScout <noreply@your-verified-domain.com>
WEB_APP_URL=https://your-flipscout-domain.com
```

No Resend SDK is required. The API uses Node's built-in `fetch` to call
`POST https://api.resend.com/emails` with bearer authentication.

Production defaults to the Resend provider and fails fast at API startup when
`RESEND_API_KEY` or `RESEND_FROM_EMAIL` is missing. The console provider also
refuses to send in production so verification/reset tokens are not accidentally
printed to production logs.

Registration and resend-verification attempts do not discard a successfully
created account if email delivery is temporarily unavailable. The API records
the delivery result and logs the provider failure so the user can retry.
Forgot-password keeps its response generic regardless of account existence or
email-delivery state to prevent account enumeration.

## Authentication security hardening

The API now applies dependency-free, per-client rate limits to sensitive auth
operations:

```text
register             5 requests / 60 minutes
login               10 requests / 15 minutes
forgot password      5 requests / 15 minutes
reset password      10 requests / 15 minutes
verify email        10 requests / 15 minutes
resend verification  5 requests / 15 minutes
change password      5 requests / 15 minutes
```

Rate-limited requests return HTTP `429`, code `RATE_LIMITED`, and a standard
`Retry-After` header.

By default, FlipScout identifies clients from the TCP socket. If the API is
deployed behind a trusted reverse proxy that overwrites `X-Forwarded-For`, set:

```env
TRUST_PROXY=true
```

Do not enable `TRUST_PROXY` when clients can send `X-Forwarded-For` directly.

The current limiter is intentionally in-memory and dependency-free. It is
appropriate for local development and a single API instance. Before horizontally
scaling the API, replace its backing store with a shared limiter such as Redis
so limits are consistent across instances.

JSON request bodies are capped at 64 KiB. Empty or malformed JSON now returns
HTTP `400` with `INVALID_JSON`, and oversized JSON returns HTTP `413` with
`PAYLOAD_TOO_LARGE` instead of falling into the generic 500 handler.

`AUTH_SESSION_DAYS`, `PASSWORD_RESET_MINUTES`, and
`EMAIL_VERIFICATION_HOURS` are now required to be positive integers when set.
Invalid values fail explicitly rather than producing broken expiration times.

API JSON responses also include `Cache-Control: no-store` and
`X-Content-Type-Options: nosniff`.

## Auth UX and cross-tab synchronization

The web client now translates known API authentication error codes instead of
showing backend English messages directly. This keeps login, registration,
password recovery/reset, email verification, and account security errors
consistent in English and Vietnamese.

Protected-route loading text and password visibility accessibility labels are
also translated. Password fields on registration confirmation, password reset,
and account password changes now have explicit show/hide controls.

Post-login return paths are validated as same-origin application paths. Values
that are protocol-relative (`//...`), contain backslashes/control characters,
or resolve outside the FlipScout origin are rejected. A protected-page `next`
value is also preserved through registration and email verification.

Authentication state now listens for browser `storage` events. Logging in,
logging out, changing a password, or losing a session in one tab is reflected
in other FlipScout tabs without a manual refresh. This synchronization is a web
client behavior; the shared API contract remains unchanged for the future
React Native client.

## Phase 3: retailer ingestion foundation

Phase 3 now has a retailer-neutral ingestion layer. Web and future React Native
clients continue reading the same `/v1/deals` API; retailer integrations do not
leak into either client.

Normalized shared contracts cover:

```text
RetailerSourceStore
RetailerSourceDeal
RetailerIngestionBatch
RetailerIngestionResult
RetailerAdapter
```

The PostgreSQL ingestion service performs transactional store/deal upserts,
central profit and BUY-score calculation, source metadata storage, freshness
tracking, and ingestion-run auditing.

New deal metadata includes:

```text
source
source_url
sku
upc
last_seen_at
is_active
```

Stores now track:

```text
source
external_store_id
source_updated_at
```

A successful complete snapshot marks previously unseen deals from that source
inactive. Partial or paginated adapters must set `fullSnapshot=false`, which
prevents them from accidentally deactivating inventory they did not fetch.

`/v1/deals` and `/v1/deals/:id` now return only active deals. Optional source,
SKU, UPC, and source URL metadata are also available to clients without
changing the core product/resale fields.

Run the included pipeline test adapter after applying the schema:

```bash
yarn install
yarn db:bootstrap
yarn db:check
yarn ingest:retailer mock
```

The `mock` adapter exercises the same PostgreSQL ingestion path that real
retailer connectors will use. It is not a substitute for a retailer API.

Real Home Depot, Lowe's, Walmart, Target, Costco, or Dollar General connectors
are intentionally not fabricated. The next retailer-specific step should
select an authorized API/data source and implement its adapter behind the
shared `RetailerAdapter` contract.

## Phase 3: ingestion observability and freshness

FlipScout now exposes retailer-feed health separately from the deal API:

```text
GET /v1/ingestion/status
GET /v1/ingestion/runs?limit=20
```

`/v1/ingestion/status` summarizes active/inactive deals, store counts, the most
recent ingestion run, last-seen inventory time, and a normalized freshness
state for every known source:

```text
fresh
aging
stale
unknown
```

Configure the base freshness threshold with:

```env
INGESTION_STALE_AFTER_MINUTES=180
```

A source is `fresh` through that threshold, `aging` through twice the
threshold, and `stale` afterward. A latest failed ingestion run is treated as
stale immediately.

The web dashboard displays source health above the deal KPIs, shows each deal's
normalized source, and can filter the current deal set by data source. The
shared API client also exposes ingestion status/history so the future React
Native client can use the same backend observability data.

This observability layer is intentionally retailer-neutral. It gives FlipScout
a way to detect broken or delayed retailer feeds before a stale deal is treated
as a current buying opportunity.
