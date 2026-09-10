import { inspectSchema, schemaErrorCode } from "../database/schema-readiness.js";
import { positiveIntegerEnv } from "../security/config.js";
import { Pool } from "pg";
import type { Deal } from "@flipscout/types";
import type { DealProvider, DealQuery } from "./deal-provider.js";

type DealRow = {
  id: string;
  product_name: string;
  brand: string;
  retailer: string;
  store_name: string;
  city: string;
  state: string;
  distance_miles: string | number;
  latitude: string | number;
  longitude: string | number;
  retail_price: string | number;
  clearance_price: string | number;
  resale_price: string | number;
  marketplace_fee_percent: string | number;
  shipping_cost: string | number;
  other_costs: string | number;
  estimated_profit: string | number;
  roi: string | number;
  margin: string | number;
  break_even_price: string | number;
  inventory: number;
  buy_score: number;
  status: Deal["status"];
  category: string;
  updated_minutes_ago: string | number;
  source: Deal["source"];
  source_url: string | null;
  sku: string | null;
  upc: string | null;
  is_active: boolean;
};

function number(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function mapDeal(row: DealRow): Deal {
  return {
    id: row.id,
    productName: row.product_name,
    brand: row.brand,
    retailer: row.retailer,
    storeName: row.store_name,
    city: row.city,
    state: row.state,
    distanceMiles: number(row.distance_miles),
    latitude: number(row.latitude),
    longitude: number(row.longitude),
    retailPrice: number(row.retail_price),
    clearancePrice: number(row.clearance_price),
    resalePrice: number(row.resale_price),
    marketplaceFeePercent: number(row.marketplace_fee_percent),
    shippingCost: number(row.shipping_cost),
    otherCosts: number(row.other_costs),
    estimatedProfit: number(row.estimated_profit),
    roi: number(row.roi),
    margin: number(row.margin),
    breakEvenPrice: number(row.break_even_price),
    inventory: row.inventory,
    buyScore: row.buy_score,
    status: row.status,
    category: row.category,
    updatedMinutesAgo: number(row.updated_minutes_ago),
    source: row.source,
    sourceUrl: row.source_url,
    sku: row.sku,
    upc: row.upc,
    isActive: row.is_active,
  };
}

export class PostgresDealProvider implements DealProvider {
  constructor(private readonly pool: Pool) {}

  async listDeals(query: DealQuery = {}): Promise<Deal[]> {
    const values: unknown[] = [
      query.originLatitude ?? null,
      query.originLongitude ?? null,
    ];
    const where: string[] = ["d.is_active = TRUE"];

    if (query.q) {
      const search = query.storeId ? query.q.replace(/[\\%_]/g, "\\$&") : query.q;
      values.push(`%${search}%`);
      const i = values.length;
      where.push(query.storeId ? `(d.product_name ILIKE $${i} OR d.brand ILIKE $${i})` : `(
        d.product_name ILIKE $${i}
        OR d.brand ILIKE $${i}
        OR s.retailer ILIKE $${i}
        OR s.store_name ILIKE $${i}
        OR d.category ILIKE $${i}
        OR s.city ILIKE $${i}
        OR s.state ILIKE $${i}
      )`);
    }

    if (query.retailer) {
      values.push(query.retailer);
      where.push(`s.retailer = $${values.length}`);
    }

    if (query.category) {
      values.push(query.category);
      where.push(query.storeId ? `LOWER(d.category) = LOWER($${values.length})` : `d.category = $${values.length}`);
    }

    if (query.source) {
      values.push(query.source);
      where.push(`d.source = $${values.length}`);
    }

    if (query.storeId) {
      values.push(query.storeId);
      where.push(`s.id::text = $${values.length}`, "s.is_active = TRUE", "d.inventory > 0");
      values.push(positiveIntegerEnv("INGESTION_STALE_AFTER_MINUTES", 180));
      where.push(`COALESCE(d.source_updated_at, d.updated_at) >= NOW() - ($${values.length} * INTERVAL '1 minute')`);
    }
    const inventoryOrders = {
      "buy-score": "d.buy_score DESC, d.estimated_profit DESC, d.id",
      "profit": "d.estimated_profit DESC, d.id",
      "price-asc": "d.clearance_price ASC, d.id",
      "price-desc": "d.clearance_price DESC, d.id",
    };
    const order = query.storeId ? inventoryOrders[query.inventorySort ?? "buy-score"] : inventoryOrders["buy-score"];
    let pagination = "";
    if (query.limit !== undefined) {
      values.push(query.limit, query.offset ?? 0);
      pagination = `LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    const result = await this.pool.query<DealRow>(
      `
      SELECT
        d.id::text,
        d.product_name,
        d.brand,
        s.retailer,
        s.store_name,
        s.city,
        s.state,
        CASE
          WHEN $1::double precision IS NULL OR $2::double precision IS NULL
          THEN 0::double precision
          ELSE (
            3958.7613 * 2 * ASIN(
              SQRT(LEAST(1.0, GREATEST(0.0,
                POWER(SIN(RADIANS(s.latitude - $1::double precision) / 2), 2)
                + COS(RADIANS($1::double precision))
                * COS(RADIANS(s.latitude))
                * POWER(SIN(RADIANS(s.longitude - $2::double precision) / 2), 2)
              )))
            )
          )
        END AS distance_miles,
        s.latitude,
        s.longitude,
        d.retail_price,
        d.clearance_price,
        d.resale_price,
        d.marketplace_fee_percent,
        d.shipping_cost,
        d.other_costs,
        d.estimated_profit,
        d.roi,
        d.margin,
        d.break_even_price,
        d.inventory,
        d.buy_score,
        d.status,
        d.category,
        d.source,
        d.source_url,
        d.sku,
        d.upc,
        d.is_active,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(d.source_updated_at, d.updated_at))) / 60
          AS updated_minutes_ago
      FROM deals d
      JOIN stores s ON s.id = d.store_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY ${order}
      ${pagination}
      `,
      values,
    );

    return result.rows.map(mapDeal);
  }

  async getDeal(id: string): Promise<Deal | null> {
    const result = await this.pool.query<DealRow>(
      `
      SELECT
        d.id::text,
        d.product_name,
        d.brand,
        s.retailer,
        s.store_name,
        s.city,
        s.state,
        0::double precision AS distance_miles,
        s.latitude,
        s.longitude,
        d.retail_price,
        d.clearance_price,
        d.resale_price,
        d.marketplace_fee_percent,
        d.shipping_cost,
        d.other_costs,
        d.estimated_profit,
        d.roi,
        d.margin,
        d.break_even_price,
        d.inventory,
        d.buy_score,
        d.status,
        d.category,
        d.source,
        d.source_url,
        d.sku,
        d.upc,
        d.is_active,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(d.source_updated_at, d.updated_at))) / 60 AS updated_minutes_ago
      FROM deals d
      JOIN stores s ON s.id = d.store_id
      WHERE d.id = $1
        AND d.is_active = TRUE
      LIMIT 1
      `,
      [id],
    );

    return result.rows[0] ? mapDeal(result.rows[0]) : null;
  }

  async health() {
    const status = await inspectSchema(this.pool);
    return { ok: status.ok, detail: status.ok ? "postgres" : schemaErrorCode };
  }
}
