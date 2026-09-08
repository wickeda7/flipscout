import "dotenv/config";
import { createServer } from "node:http";
import { URL } from "node:url";
import type { LoginRequest, OptimizeRouteRequest, RegisterRequest } from "@flipscout/types";
import { createProviders } from "./providers/index.js";
import { AuthError } from "./providers/auth-provider.js";
import {
  optimizeWithMapbox,
  RouteError,
} from "./mapbox-routing.js";

const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV ?? "development";
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const {
  name: dataProviderName,
  dealProvider,
  watchlistProvider,
  authProvider,
} = createProviders();

const DEV_USER_ID =
  process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000001";


function getBearerToken(
  request: import("node:http").IncomingMessage,
): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

async function resolveUserId(
  request: import("node:http").IncomingMessage,
): Promise<string> {
  const token = getBearerToken(request);

  if (!token) {
    if (process.env.ALLOW_DEV_AUTH_FALLBACK === "true") {
      return DEV_USER_ID;
    }

    throw new AuthError(
      "Authentication required.",
      401,
      "UNAUTHORIZED",
    );
  }

  const user = await authProvider.getUserByToken(token);

  if (!user) {
    throw new AuthError(
      "Session is invalid or expired.",
      401,
      "UNAUTHORIZED",
    );
  }

  return user.id;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function writeJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": WEB_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

async function readJson<T>(
  request: import("node:http").IncomingMessage,
): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

const server = createServer(async (request, response) => {
  try {
    if (!request.url || !request.method) {
      writeJson(response, 400, { error: "Invalid request." });
      return;
    }

    if (request.method === "OPTIONS") {
      writeJson(response, 204, null);
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      let dataProviderHealth = { ok: true, detail: dataProviderName };
      try {
        dataProviderHealth =
          (await dealProvider.health?.()) ?? dataProviderHealth;
      } catch (error) {
        dataProviderHealth = {
          ok: false,
          detail: error instanceof Error ? error.message : "provider error",
        };
      }

      writeJson(response, dataProviderHealth.ok ? 200 : 503, {
        service: "flipscout-api",
        status: dataProviderHealth.ok ? "ok" : "degraded",
        dataProvider: dataProviderName,
        dataProviderHealth,
        mapboxConfigured: Boolean(process.env.MAPBOX_ACCESS_TOKEN),
      });
      return;
    }


    if (request.method === "POST" && url.pathname === "/v1/auth/register") {
      const body = await readJson<RegisterRequest>(request);
      const email = body.email?.trim() ?? "";
      const password = body.password ?? "";
      const displayName = body.displayName?.trim();

      if (!validateEmail(email)) {
        writeJson(response, 400, {
          error: "Enter a valid email address.",
          code: "INVALID_EMAIL",
        });
        return;
      }

      if (password.length < 8) {
        writeJson(response, 400, {
          error: "Password must be at least 8 characters.",
          code: "WEAK_PASSWORD",
        });
        return;
      }

      if (displayName && displayName.length > 80) {
        writeJson(response, 400, {
          error: "Display name must be 80 characters or fewer.",
          code: "INVALID_DISPLAY_NAME",
        });
        return;
      }

      const auth = await authProvider.register({
        email,
        password,
        displayName,
      });

      writeJson(response, 201, auth);
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/login") {
      const body = await readJson<LoginRequest>(request);
      const email = body.email?.trim() ?? "";
      const password = body.password ?? "";

      if (!email || !password) {
        writeJson(response, 400, {
          error: "Email and password are required.",
          code: "MISSING_CREDENTIALS",
        });
        return;
      }

      const auth = await authProvider.login({ email, password });
      writeJson(response, 200, auth);
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/auth/me") {
      const token = getBearerToken(request);

      if (!token) {
        writeJson(response, 401, {
          error: "Authentication required.",
          code: "UNAUTHORIZED",
        });
        return;
      }

      const user = await authProvider.getUserByToken(token);

      if (!user) {
        writeJson(response, 401, {
          error: "Session is invalid or expired.",
          code: "UNAUTHORIZED",
        });
        return;
      }

      writeJson(response, 200, { user });
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/auth/logout") {
      const token = getBearerToken(request);
      if (token) await authProvider.logout(token);
      writeJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/deals") {
      const q = url.searchParams.get("q")?.trim() || undefined;
      const retailer = url.searchParams.get("retailer") || undefined;
      const category = url.searchParams.get("category") || undefined;
      const originLatitudeRaw = url.searchParams.get("lat");
      const originLongitudeRaw = url.searchParams.get("lng");
      const originLatitude =
        originLatitudeRaw !== null ? Number(originLatitudeRaw) : undefined;
      const originLongitude =
        originLongitudeRaw !== null ? Number(originLongitudeRaw) : undefined;

      if (
        (originLatitude !== undefined && !Number.isFinite(originLatitude)) ||
        (originLongitude !== undefined && !Number.isFinite(originLongitude))
      ) {
        writeJson(response, 400, { error: "Invalid lat/lng query parameters." });
        return;
      }

      const deals = await dealProvider.listDeals({
        q,
        retailer:
          retailer && retailer !== "All stores" ? retailer : undefined,
        category:
          category && category !== "All categories" ? category : undefined,
        originLatitude,
        originLongitude,
      });

      writeJson(response, 200, deals);
      return;
    }

    const dealMatch = url.pathname.match(/^\/v1\/deals\/([^/]+)$/);
    if (request.method === "GET" && dealMatch) {
      const id = decodeURIComponent(dealMatch[1]);
      const deal = await dealProvider.getDeal(id);

      if (!deal) {
        writeJson(response, 404, { error: "Deal not found." });
        return;
      }

      writeJson(response, 200, deal);
      return;
    }


    if (url.pathname === "/v1/watchlist" && request.method === "GET") {
      const userId = await resolveUserId(request);
      const items = await watchlistProvider.list(userId);
      writeJson(response, 200, { items });
      return;
    }

    if (url.pathname === "/v1/watchlist" && request.method === "POST") {
      const body = await readJson<{ dealId?: string }>(request);

      if (!body.dealId) {
        writeJson(response, 400, { error: "dealId is required." });
        return;
      }

      const deal = await dealProvider.getDeal(body.dealId);
      if (!deal) {
        writeJson(response, 404, { error: "Deal not found." });
        return;
      }

      const userId = await resolveUserId(request);
      await watchlistProvider.add(userId, body.dealId);
      writeJson(response, 201, { ok: true });
      return;
    }

    const watchlistItemMatch = url.pathname.match(
      /^\/v1\/watchlist\/([^/]+)$/,
    );

    if (request.method === "DELETE" && watchlistItemMatch) {
      const dealId = decodeURIComponent(watchlistItemMatch[1]);
      const userId = await resolveUserId(request);
      await watchlistProvider.remove(userId, dealId);
      writeJson(response, 200, { ok: true });
      return;
    }

    if (
      request.method === "DELETE" &&
      url.pathname === "/v1/watchlist"
    ) {
      const userId = await resolveUserId(request);
      await watchlistProvider.clear(userId);
      writeJson(response, 200, { ok: true });
      return;
    }

    if (
      request.method === "POST" &&
      url.pathname === "/v1/routes/optimize"
    ) {
      const token = process.env.MAPBOX_ACCESS_TOKEN;

      if (!token) {
        writeJson(response, 503, {
          error:
            "MAPBOX_ACCESS_TOKEN is not configured on the FlipScout API.",
        });
        return;
      }

      const body = await readJson<OptimizeRouteRequest>(request);
      const route = await optimizeWithMapbox(body, token);
      writeJson(response, 200, route);
      return;
    }

    writeJson(response, 404, { error: "Endpoint not found." });
  } catch (error) {
    if (error instanceof AuthError) {
      writeJson(response, error.status, {
        error: error.message,
        code: error.code,
      });
      return;
    }

    if (error instanceof RouteError) {
      writeJson(response, error.status, { error: error.message });
      return;
    }

    console.error(error);
    writeJson(response, 500, {
      error: "Unexpected server error.",
      ...(NODE_ENV !== "production" && error instanceof Error
        ? { detail: error.message }
        : {}),
    });
  }
});

server.listen(PORT, () => {
  console.log(`FlipScout API listening on http://localhost:${PORT}`);
  console.log(`FlipScout data provider: ${dataProviderName}`);
});
