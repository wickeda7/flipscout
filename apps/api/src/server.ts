import "dotenv/config";
import { createServer } from "node:http";
import { URL } from "node:url";
import type { OptimizeRouteRequest } from "@flipscout/types";
import { createDealProvider } from "./providers/index.js";
import {
  optimizeWithMapbox,
  RouteError,
} from "./mapbox-routing.js";

const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const { name: dataProviderName, provider: dealProvider } = createDealProvider();

function writeJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": WEB_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

    if (request.method === "GET" && url.pathname === "/v1/deals") {
      const q = url.searchParams.get("q")?.trim() || undefined;
      const retailer = url.searchParams.get("retailer") || undefined;
      const category = url.searchParams.get("category") || undefined;

      const deals = await dealProvider.listDeals({
        q,
        retailer:
          retailer && retailer !== "All stores" ? retailer : undefined,
        category:
          category && category !== "All categories" ? category : undefined,
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
    if (error instanceof RouteError) {
      writeJson(response, error.status, { error: error.message });
      return;
    }

    console.error(error);
    writeJson(response, 500, { error: "Unexpected server error." });
  }
});

server.listen(PORT, () => {
  console.log(`FlipScout API listening on http://localhost:${PORT}`);
  console.log(`FlipScout data provider: ${dataProviderName}`);
});
