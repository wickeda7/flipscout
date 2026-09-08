import "dotenv/config";
import { Pool } from "pg";
import { getRetailerAdapter } from "../src/ingestion/adapter-registry.js";
import { ConnectorError, loadSources, readiness } from "../src/ingestion/http-config.js";
import { HttpJsonAdapter } from "../src/ingestion/http-json-adapter.js";
import { runSource } from "../src/ingestion/run-source.js";

let pool: Pool | undefined;
try {
  if (!process.env.DATABASE_URL) throw new ConnectorError("DATABASE_URL_REQUIRED");
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2,
    connectionTimeoutMillis: 15000, statement_timeout: 120000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined });
  const source = process.argv[2] ?? "mock";
  const jobs = source === "--due"
    ? loadSources().filter(c => c.enabled).map(c => ({ adapter: new HttpJsonAdapter(c), interval: c.intervalMinutes, ready: readiness(c) }))
    : [{ adapter: getRetailerAdapter(source), interval: undefined, ready: "ready" }];
  for (const job of jobs) {
    try {
      if (job.ready !== "ready") throw new ConnectorError("SOURCE_NOT_READY");
      console.log(JSON.stringify(await runSource(pool, job.adapter, job.interval)));
    } catch (e) {
      console.error(JSON.stringify({ source: job.adapter.source, status: "failed", code: e instanceof ConnectorError ? e.code : "INGESTION_FAILED" }));
      process.exitCode = 1;
    } finally {
      if (job.adapter instanceof HttpJsonAdapter) console.log(JSON.stringify({ source: job.adapter.source, diagnostics: job.adapter.diagnostics }));
    }
  }
} catch (e) { console.error(e instanceof ConnectorError ? e.code : "INGESTION_FAILED"); process.exitCode = 1; }
finally { await pool?.end(); }
