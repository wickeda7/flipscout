import type { Pool } from "pg";

// Presence checks only: constraints, types and indexes are maintained by schema.sql.
export const requiredColumns: Record<string, string[]> = {
  "users": [
    "id",
    "email",
    "display_name",
    "password_hash",
    "email_verified_at",
    "created_at"
  ],
  "auth_sessions": [
    "token_hash",
    "user_id",
    "expires_at",
    "created_at"
  ],
  "email_verification_tokens": [
    "token_hash",
    "user_id",
    "expires_at",
    "created_at"
  ],
  "password_reset_tokens": [
    "token_hash",
    "user_id",
    "expires_at",
    "created_at"
  ],
  "user_preferences": [
    "user_id",
    "locale",
    "created_at",
    "updated_at"
  ],
  "stores": [
    "id",
    "source",
    "external_store_id",
    "retailer",
    "retailer_store_id",
    "store_name",
    "city",
    "state",
    "latitude",
    "longitude",
    "source_updated_at",
    "source_url",
    "sku",
    "upc",
    "last_seen_at",
    "is_active",
    "created_at",
    "updated_at"
  ],
  "deals": [
    "id",
    "source",
    "external_id",
    "store_id",
    "product_name",
    "brand",
    "category",
    "retail_price",
    "clearance_price",
    "resale_price",
    "marketplace_fee_percent",
    "shipping_cost",
    "other_costs",
    "inventory",
    "estimated_profit",
    "roi",
    "margin",
    "break_even_price",
    "buy_score",
    "status",
    "source_updated_at",
    "source_url",
    "sku",
    "upc",
    "last_seen_at",
    "is_active",
    "created_at",
    "updated_at"
  ],
  "watchlist_items": [
    "user_id",
    "deal_id",
    "created_at"
  ],
  "ingestion_runs": [
    "id",
    "source",
    "status",
    "fetched_at",
    "stores_upserted",
    "deals_upserted",
    "deals_skipped",
    "started_at",
    "completed_at",
    "error_message"
  ]
};
export const migrationAction = "Run yarn db:migrate, then yarn db:check.";
export const schemaErrorCode = "DATABASE_SCHEMA_OUTDATED";

export async function inspectSchema(db: Pick<Pool, "query">) {
  // Resolve relations using the connection's search_path, just like application queries.
  const result = await db.query<{ table_name: string; column_name: string; table_missing: boolean; column_missing: boolean }>(`
    SELECT r.key AS table_name, c.value AS column_name,
      to_regclass(r.key) IS NULL AS table_missing,
      a.attname IS NULL AS column_missing
    FROM jsonb_each($1::jsonb) r
    CROSS JOIN LATERAL jsonb_array_elements_text(r.value) c
    LEFT JOIN pg_attribute a ON a.attrelid = to_regclass(r.key)
      AND a.attname = c.value AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY r.key, c.value
  `, [JSON.stringify(requiredColumns)]);
  const missingTables = [...new Set(result.rows.filter(r => r.table_missing).map(r => r.table_name))];
  const missingColumns = result.rows.filter(r => !r.table_missing && r.column_missing)
    .map(r => `${r.table_name}.${r.column_name}`);
  return { ok: missingTables.length === 0 && missingColumns.length === 0, missingTables, missingColumns };
}

export async function assertSchemaReady(db: Pick<Pool, "query">) {
  const status = await inspectSchema(db);
  if (!status.ok) throw new Error(`Database schema is incomplete: ${[...status.missingTables, ...status.missingColumns].join(", ")}. ${migrationAction}`);
}

export function isMissingSchemaError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error.code === "42703" || error.code === "42P01");
}
