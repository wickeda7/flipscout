import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  max: 1,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

async function run() {
  const db = await pool.query<{ database: string; user_name: string }>(
    "SELECT current_database() AS database, current_user AS user_name",
  );

  const tables = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'users',
        'auth_sessions',
        'email_verification_tokens',
        'password_reset_tokens',
        'user_preferences',
        'stores',
        'deals',
        'watchlist_items'
      )
    ORDER BY table_name
  `);

  const tableNames = new Set(tables.rows.map((row) => row.table_name));
  const required = [
    "users",
    "auth_sessions",
    "email_verification_tokens",
    "password_reset_tokens",
    "user_preferences",
    "stores",
    "deals",
    "watchlist_items",
  ];
  const missing = required.filter((name) => !tableNames.has(name));

  let dealCount = 0;
  if (!missing.includes("deals")) {
    const deals = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM deals",
    );
    dealCount = Number(deals.rows[0]?.count ?? 0);
  }

  console.log(
    JSON.stringify(
      {
        ok: missing.length === 0,
        database: db.rows[0]?.database,
        user: db.rows[0]?.user_name,
        tables: [...tableNames],
        missingTables: missing,
        dealCount,
      },
      null,
      2,
    ),
  );

  await pool.end();

  if (missing.length > 0) {
    process.exit(1);
  }
}

run().catch(async (error) => {
  console.error(
    error instanceof Error ? error.message : "Database health check failed.",
  );
  await pool.end().catch(() => undefined);
  process.exit(1);
});
