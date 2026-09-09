For the current monorepo, install dependencies at the repository root with `yarn install --frozen-lockfile`, then run `yarn dev:web`. See the root PHASE4-STORES.md guide. Historical milestones follow.

# FlipScout — Phase 1

Next.js dashboard MVP for clearance retail-arbitrage opportunities.

## Included

- Dark dashboard UI
- Sidebar navigation
- KPI cards
- Search
- Retailer filtering
- Category filtering
- Reusable deal cards
- Mock deal data
- BUY score presentation

## Run

```bash
yarn install --frozen-lockfile
yarn dev
```

Then open http://localhost:3000.

## Next

Phase 2 can add:
- Profit calculator
- Real BUY score calculations
- Marketplace fee estimates
- Shipping assumptions
- Product detail page


## CSS fix for Next.js 16

This version uses Tailwind CSS 4.

Important files:

```text
postcss.config.mjs
src/app/globals.css
```

`globals.css` now starts with:

```css
@import "tailwindcss";
```

After upgrading from the previous archive, delete cached dependencies before reinstalling:

```bash
rm -rf node_modules .next package-lock.json
yarn install --frozen-lockfile
yarn dev
```

If the dev server was already running, stop it before reinstalling.


## Tailwind CSS 4 added safely

The existing plain CSS remains in place, so the dashboard layout is protected while Tailwind is introduced.

Tailwind 4 is configured through `@tailwindcss/postcss` and imported at the top of `src/app/globals.css`:

```css
@import "tailwindcss";
```

After extracting this version, do a clean dependency install:

```bash
rm -rf node_modules .next package-lock.json
yarn install --frozen-lockfile
yarn verify:tailwind
yarn dev
```

You should see a small `Tailwind 4` badge next to the date. That badge uses only Tailwind utilities and confirms Tailwind compilation is working. The rest of the dashboard still uses the existing CSS classes, ready for incremental migration.


## Phase 2

Added:

- Reusable profit engine
- Weighted BUY score engine
- Marketplace fee calculation
- Shipping and other costs
- Net profit
- ROI
- Profit margin
- Break-even resale price
- Interactive `/calculator` page
- Mock deals now calculate metrics from shared business logic



## Marketplace presets

The calculator now includes presets for eBay, Amazon, Facebook Marketplace,
OfferUp, Local Sale, and Custom. Preset values are planning assumptions and
can be manually overridden.

## Maximum purchase price

The calculator now computes the highest purchase price that satisfies both
the user's minimum profit target and minimum ROI target.

## Deal detail analysis

Added `/deals/[id]` with max-buy guidance, score breakdown, resale scenarios, cost breakdown, and risk flags.


## Watchlist

Deals can now be saved from the dashboard and deal detail page. Saved deal IDs
are persisted in browser localStorage for the Phase 2 MVP and are available at
`/watchlist`. The page summarizes saved deal count, expected profit, and units.

A future authenticated version should move watchlist persistence to the backend
so saved deals sync across devices.


## Stores and trip planning

The `/stores` page groups clearance opportunities by retailer location and
ranks stores using potential resale profit per mile. Each store card shows
deal count, units, average BUY score, strong buys, potential profit, and the
best products available at that stop.

This Phase 2 ranking is intentionally simple: it uses one-way distance from
the deal data. A later phase can add map routing, fuel cost, traffic, and
multi-stop route optimization.


## Route optimizer

The Stores page now includes an interactive trip planner. Users can select
stores and adjust MPG, gas price, and an estimated detour allowance per extra
stop. FlipScout calculates estimated trip miles, fuel cost, gross potential
profit, net trip profit, and profit per mile.

This is still an MVP routing heuristic because the mock deal data only includes
distance from the user, not latitude/longitude. Exact multi-stop road routing
will require store coordinates plus a maps/routing provider.


## Coordinate-based routing

Mock deals now include latitude and longitude. The route optimizer uses the
Haversine formula to calculate point-to-point distance and a nearest-neighbor
heuristic to choose the visit order. The planner also renders a lightweight
route preview and exposes a road-distance multiplier for estimating driving
miles from straight-line distance.

The included coordinates are mock/demo coordinates for Phase 2. Production
routing should use verified store coordinates and a live routing provider such
as Google Maps, Mapbox, HERE, or another directions API.


## Live Mapbox routing

FlipScout now includes a server-side Mapbox Optimization API integration at:

`POST /api/routes/optimize`

To enable live road routing, copy `.env.example` to `.env.local` and set:

```bash
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

Restart the Next.js development server after changing environment variables.

The access token is read only by the server route and is not exposed as a
`NEXT_PUBLIC_*` browser variable. The route planner sends the selected store
coordinates to the internal Next.js API route, which requests a duration-
optimized round trip from Mapbox and returns actual road distance, estimated
drive time, optimized stop order, route legs, and GeoJSON route geometry.

If no token is configured, Mapbox is unavailable, or the live request fails,
the Stores page remains usable and automatically falls back to FlipScout's
local Haversine/nearest-neighbor route estimator.

Mapbox Optimization API v1 accepts up to 12 coordinates per request, so this
implementation allows one origin plus up to 11 selected stores.


## Mapbox-only route preview

The Stores route preview now uses Mapbox GL JS directly. Leaflet and
OpenStreetMap have been removed from the project.

Install dependencies after extracting this version:

```bash
yarn install --frozen-lockfile
```

Create `.env.local` from `.env.example` and configure:

```bash
MAPBOX_ACCESS_TOKEN=your_server_mapbox_access_token_here
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_public_mapbox_access_token_here
```

`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` renders the interactive Mapbox GL JS map in
the browser. `MAPBOX_ACCESS_TOKEN` is read by the internal Next.js route that
calls Mapbox's Optimization API.

The map shows the start point, numbered store markers, popups, and the route
polyline. Before a live route is requested, it draws the local coordinate-based
route estimate. After live routing succeeds, it replaces that line with the
Mapbox road geometry and fits the camera to the full route.

If the public map token is missing, Route Preview displays a configuration
message instead of an empty map.
