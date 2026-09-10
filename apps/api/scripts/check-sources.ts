import { feedReport } from "../src/ingestion/feed-report.js";
import "dotenv/config";
import { ConnectorError, loadSources, readiness } from "../src/ingestion/http-config.js";
import { HttpJsonAdapter } from "../src/ingestion/http-json-adapter.js";
try {
  const configs = loadSources();
  const source = process.argv[2];
  if (source) {
    const c = configs.find(c => c.source === source);
    if (!c) throw new ConnectorError("SOURCE_NOT_CONFIGURED");
    const a = new HttpJsonAdapter(c);
    try {
      const b = await a.fetchBatch();
      const report = feedReport(b, Number(process.env.INGESTION_STALE_AFTER_MINUTES ?? 180));
      console.log(JSON.stringify({ ...report, diagnostics: a.diagnostics }, null, 2));
      if (report.status === "needs-review") process.exitCode = 1;
    } catch (e) { console.log(JSON.stringify({ source, diagnostics: a.diagnostics })); throw e; }
  } else {
    console.log(JSON.stringify(configs.map(c => ({ source: c.source, readiness: readiness(c), intervalMinutes: c.intervalMinutes, fullSnapshot: c.fullSnapshot })), null, 2));
    if (configs.some(c => c.enabled && readiness(c) !== "ready")) process.exitCode = 1;
  }
} catch (e) { console.error(e instanceof ConnectorError ? e.code : "CHECK_FAILED"); process.exitCode = 1; }
