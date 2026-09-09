import type { Pool } from "pg";
import type {
  IngestionRunSummary,
  IngestionSourceStatus,
  IngestionStatusResponse,
  RetailerSource,
} from "@flipscout/types";
import type { IngestionStatusProvider } from "./ingestion-status-provider.js";
import { positiveIntegerEnv } from "../security/config.js";

type RunRow = {
  id: string;
  source: RetailerSource;
  status: "completed" | "failed";
  fetched_at: string | Date | null;
  stores_upserted: number;
  deals_upserted: number;
  deals_skipped: number;
  started_at: string | Date;
  completed_at: string | Date;
  error_message: string | null;
};

function iso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRun(row: RunRow): IngestionRunSummary {
  return {
    id: row.id,
    source: row.source,
    status: row.status,
    fetchedAt: iso(row.fetched_at),
    storesUpserted: row.stores_upserted,
    dealsUpserted: row.deals_upserted,
    dealsSkipped: row.deals_skipped,
    startedAt: iso(row.started_at)!,
    completedAt: iso(row.completed_at)!,
    errorMessage: row.error_message,
  };
}

export class PostgresIngestionStatusProvider
  implements IngestionStatusProvider
{
  constructor(private readonly pool: Pool) {}

  async getStatus(): Promise<IngestionStatusResponse> {
    const staleAfterMinutes = positiveIntegerEnv(
      "INGESTION_STALE_AFTER_MINUTES",
      180,
    );

    const sourcesResult = await this.pool.query<{
      source: RetailerSource;
      active_deals: number;
      inactive_deals: number;
      stores: number;
      last_seen_at: string | Date | null;
    }>(
      `
      WITH source_names AS (
        SELECT source FROM deals
        UNION
        SELECT source FROM stores
        UNION
        SELECT source FROM ingestion_runs
      ),
      deal_counts AS (
        SELECT
          source,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_deals,
          COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive_deals,
          MAX(last_seen_at) AS last_seen_at
        FROM deals
        GROUP BY source
      ),
      store_counts AS (
        SELECT source, COUNT(*)::int AS stores
        FROM stores
        GROUP BY source
      )
      SELECT
        n.source,
        COALESCE(d.active_deals, 0)::int AS active_deals,
        COALESCE(d.inactive_deals, 0)::int AS inactive_deals,
        COALESCE(s.stores, 0)::int AS stores,
        d.last_seen_at
      FROM source_names n
      LEFT JOIN deal_counts d ON d.source = n.source
      LEFT JOIN store_counts s ON s.source = n.source
      ORDER BY n.source
      `,
    );

    const latestRuns = await this.pool.query<RunRow>(
      `
      SELECT DISTINCT ON (source)
        id::text,
        source,
        status,
        fetched_at,
        stores_upserted,
        deals_upserted,
        deals_skipped,
        started_at,
        completed_at,
        error_message
      FROM ingestion_runs
      ORDER BY source, started_at DESC
      `,
    );

    const latestBySource = new Map(
      latestRuns.rows.map((row) => [row.source, mapRun(row)]),
    );

    const now = Date.now();

    const sources: IngestionSourceStatus[] = sourcesResult.rows.map((row) => {
      const lastSeenAt = iso(row.last_seen_at);
      const latestRun = latestBySource.get(row.source) ?? null;

      let freshness: IngestionSourceStatus["freshness"] = "unknown";

      if (latestRun?.status === "failed") {
        freshness = "stale";
      } else if (lastSeenAt) {
        const ageMinutes = (now - Date.parse(lastSeenAt)) / 60_000;

        freshness =
          ageMinutes <= staleAfterMinutes
            ? "fresh"
            : ageMinutes <= staleAfterMinutes * 2
              ? "aging"
              : "stale";
      }

      return {
        source: row.source,
        activeDeals: row.active_deals,
        inactiveDeals: row.inactive_deals,
        stores: row.stores,
        lastSeenAt,
        latestRun,
        freshness,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      staleAfterMinutes,
      sources,
    };
  }

  async listRuns(limit = 20): Promise<IngestionRunSummary[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    const result = await this.pool.query<RunRow>(
      `
      SELECT
        id::text,
        source,
        status,
        fetched_at,
        stores_upserted,
        deals_upserted,
        deals_skipped,
        started_at,
        completed_at,
        error_message
      FROM ingestion_runs
      ORDER BY started_at DESC
      LIMIT $1
      `,
      [safeLimit],
    );

    return result.rows.map(mapRun);
  }
}
