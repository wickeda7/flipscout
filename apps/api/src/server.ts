import "dotenv/config";
import { createServer } from "node:http";
import { URL } from "node:url";
import type { OptimizeRouteRequest } from "@flipscout/types";
import { mockDeals } from "./mock-deals.js";
import {
  optimizeWithMapbox,
  RouteError,
} from "./mapbox-routing.js";

const PORT = Number(process.env.PORT ?? 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

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
      writeJson(response, 200, {
        service: "flipscout-api",
        status: "ok",
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/deals") {
      const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
      const retailer = url.searchParams.get("retailer");
      const category = url.searchParams.get("category");

      const deals = mockDeals.filter((deal) => {
        const matchesQuery =
          !q ||
          [
            deal.productName,
            deal.brand,
            deal.retailer,
            deal.storeName,
            deal.city,
            deal.state,
            deal.category,
          ].some((value) => value.toLowerCase().includes(q));

        const matchesRetailer =
          !retailer || retailer === "All stores" || deal.retailer === retailer;

        const matchesCategory =
          !category ||
          category === "All categories" ||
          deal.category === category;

        return matchesQuery && matchesRetailer && matchesCategory;
      });

      writeJson(response, 200, deals);
      return;
    }

    const dealMatch = url.pathname.match(/^\/v1\/deals\/([^/]+)$/);
    if (request.method === "GET" && dealMatch) {
      const id = decodeURIComponent(dealMatch[1]);
      const deal = mockDeals.find((item) => item.id === id);

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
});
