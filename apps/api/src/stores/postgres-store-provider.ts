import type { Pool } from "pg";
import type { StoreSearchResponse, StoreSummary } from "@flipscout/types";
import { positiveIntegerEnv } from "../security/config.js";
import type { StoreProvider } from "./store-provider.js";
import type { ResolvedStoreQuery } from "./query.js";

export class PostgresStoreProvider implements StoreProvider {
  constructor(private readonly pool: Pool) {}
  async search(q: ResolvedStoreQuery): Promise<StoreSearchResponse> {
    // Escape LIKE metacharacters so text search is literal, as in the mock provider.
    const pattern = q.q ? "%" + q.q.replace(/[\\%_]/g, "\\$&") + "%" : null;
    const order = q.sort === "distance" ? '"distanceMiles", "storeName", id' : '"storeName", id';
    const result = await this.pool.query<{ total: number; stores: StoreSummary[] }>(`
      WITH catalog AS (
        SELECT s.id::text AS id, s.source, s.retailer, s.store_name AS "storeName", s.city, s.state,
          s.latitude, s.longitude,
          CASE WHEN $1::double precision IS NULL THEN NULL ELSE
            3958.7613 * 2 * ASIN(SQRT(LEAST(1.0, GREATEST(0.0,
              POWER(SIN(RADIANS(s.latitude - $1::double precision) / 2), 2)
              + COS(RADIANS($1::double precision)) * COS(RADIANS(s.latitude))
              * POWER(SIN(RADIANS(s.longitude - $2::double precision) / 2), 2)
            )))) END AS "distanceMiles"
        FROM stores s
        WHERE s.is_active = TRUE
          AND s.latitude BETWEEN -90 AND 90 AND s.longitude BETWEEN -180 AND 180
          AND ($3::text IS NULL OR s.store_name ILIKE $3 OR s.retailer ILIKE $3 OR s.city ILIKE $3 OR s.state ILIKE $3)
          AND ($4::text IS NULL OR LOWER(s.retailer) = LOWER($4))
          AND ($5::text IS NULL OR s.source = $5)
      ), matches AS (
        SELECT * FROM catalog WHERE $6::double precision IS NULL OR "distanceMiles" <= $6
      ), page AS (
        SELECT * FROM matches ORDER BY ${order} LIMIT $7 OFFSET $8
      ), enriched AS (
        SELECT p.*, COALESCE(a.count, 0)::int AS "activeDealCount",
          COALESCE(a.units, 0)::float8 AS "unitCount", COALESCE(a.profit, 0)::float8 AS "totalPotentialProfit",
          COALESCE(a.score, 0)::float8 AS "averageBuyScore", COALESCE(a.strong, 0)::int AS "strongBuyCount"
        FROM page p LEFT JOIN LATERAL (
          SELECT COUNT(*) AS count, SUM(d.inventory) AS units,
            SUM(d.estimated_profit * d.inventory) AS profit, AVG(d.buy_score) AS score,
            COUNT(*) FILTER (WHERE d.buy_score >= 90) AS strong
          FROM deals d WHERE d.store_id = p.id::uuid AND d.is_active = TRUE AND d.inventory > 0
            AND COALESCE(d.source_updated_at, d.updated_at) >= NOW() - ($9 * INTERVAL '1 minute')
        ) a ON TRUE
      ) SELECT (SELECT COUNT(*)::int FROM matches) AS total,
        COALESCE((SELECT jsonb_agg(e ORDER BY ${order}) FROM enriched e), '[]'::jsonb) AS stores
    `, [q.latitude ?? null, q.longitude ?? null, pattern, q.retailer ?? null, q.source ?? null, q.radiusMiles ?? null, q.limit, q.offset, positiveIntegerEnv("INGESTION_STALE_AFTER_MINUTES", 180)]);
    const { total, stores } = result.rows[0];
    return { stores, total, limit: q.limit, offset: q.offset, hasMore: q.offset + q.limit <= 10000 && q.offset + q.limit < total, dataProvider: "postgres" };
  }
}
