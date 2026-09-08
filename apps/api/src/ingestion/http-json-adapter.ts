import type { RetailerIngestionBatch, RetailerSourceStore, RetailerSourceDeal } from "@flipscout/types";
import type { RetailerAdapter } from "./retailer-adapter.js";
import { ConnectorError, parseConfig, readPath, readiness, type Endpoint, type HttpSourceConfig } from "./http-config.js";
import { validateBatch } from "./validation.js";

export class HttpJsonAdapter implements RetailerAdapter {
  readonly config: HttpSourceConfig;
  get source() { return this.config.source; }
  diagnostics = { requests: 0, retries: 0, pages: 0, records: 0, durationMs: 0 };
  constructor(config: HttpSourceConfig, private readonly fetcher: typeof fetch = fetch,
    private readonly sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))) { this.config = parseConfig(config); }

  private async request(url: URL): Promise<unknown> {
    const c = this.config;
    for (let attempt = 0; attempt <= c.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), c.timeoutMs);
      let delay = Math.min(30000, 250 * 2 ** attempt + Math.floor(Math.random() * 100));
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (c.auth) headers[c.auth.header] = (c.auth.prefix ?? "") + process.env[c.auth.env]!;
        this.diagnostics.requests++;
        const res = await this.fetcher(url, { headers, redirect: "error", signal: controller.signal });
        if (!res.ok) {
          const retry = res.status === 429 || [500, 502, 503, 504].includes(res.status);
          const after = res.headers.get("retry-after");
          if (after) {
            const ms = /^\d+$/.test(after) ? Number(after) * 1000 : Date.parse(after) - Date.now();
            if (Number.isFinite(ms)) {
              if (ms > 30000) throw new ConnectorError("RETRY_AFTER_TOO_LONG");
              delay = Math.max(delay, ms);
            }
          }
          await res.body?.cancel();
          throw new ConnectorError(retry ? "HTTP_RETRYABLE" : `HTTP_${res.status}`);
        }
        if (!/application\/(?:[a-z0-9.+-]*\+)?json\b/i.test(res.headers.get("content-type") ?? "")) {
          await res.body?.cancel(); throw new ConnectorError("INVALID_CONTENT_TYPE");
        }
        if (!res.body) throw new ConnectorError("EMPTY_RESPONSE");
        const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
        try {
          while (true) {
            const { value, done } = await reader.read(); if (done) break;
            size += value.byteLength;
            if (size > c.maxResponseBytes) throw new ConnectorError("RESPONSE_TOO_LARGE");
            chunks.push(value);
          }
        } finally { await reader.cancel().catch(() => undefined); }
        try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
        catch { throw new ConnectorError("INVALID_JSON"); }
      } catch (e) {
        const code = e instanceof ConnectorError ? e.code : controller.signal.aborted ? "HTTP_TIMEOUT" : "HTTP_NETWORK";
        if (attempt === c.retries || !["HTTP_TIMEOUT", "HTTP_NETWORK", "HTTP_RETRYABLE"].includes(code)) throw new ConnectorError(code);
        this.diagnostics.retries++;
      } finally { clearTimeout(timer); }
      await this.sleep(delay);
    }
    throw new ConnectorError("HTTP_RETRYABLE");
  }

  private async collect(e: Endpoint): Promise<Record<string, unknown>[]> {
    const records: Record<string, unknown>[] = []; const seen = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < this.config.maxPages; page++) {
      const url = new URL(e.url); const p = e.pagination;
      if (p.mode === "page") { url.searchParams.set(p.param!, String(p.start! + page)); url.searchParams.set(p.sizeParam!, String(p.pageSize)); }
      if (p.mode === "cursor" && cursor !== undefined) url.searchParams.set(p.param!, cursor);
      const body = await this.request(url); this.diagnostics.pages++;
      const items = readPath(body, e.itemsPath);
      if (!Array.isArray(items)) throw new ConnectorError("ITEMS_NOT_ARRAY");
      if (p.mode === "page" && items.length > p.pageSize!) throw new ConnectorError("INVALID_PAGE_SIZE");
      for (const item of items) {
        if (++this.diagnostics.records > this.config.maxRecords) throw new ConnectorError("RECORD_LIMIT");
        const row: Record<string, unknown> = { source: this.source };
        for (const [key, m] of Object.entries(e.mapping)) {
          const v = m.path !== undefined ? readPath(item, m.path) : m.value;
          if (v === undefined || v === null || (typeof v !== "string" && typeof v !== "number") || String(v).trim() === "") throw new ConnectorError("INVALID_MAPPING_VALUE");
          if (m.type === "number") {
            const n = Number(v) * (m.scale ?? 1);
            if (!Number.isFinite(n)) throw new ConnectorError("INVALID_NUMBER"); row[key] = n;
          } else if (m.type === "date") {
            if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) throw new ConnectorError("INVALID_DATE");
            row[key] = new Date(v).toISOString();
          } else row[key] = String(v).trim();
        }
        records.push(row);
      }
      if (p.mode === "none" || (p.mode === "page" && items.length < p.pageSize!)) return records;
      if (p.mode === "cursor") {
        const next = readPath(body, p.nextPath!);
        // Missing completion metadata is an error, never evidence of a complete snapshot.
        if (next === null || next === "") return records;
        if (typeof next !== "string" && typeof next !== "number") throw new ConnectorError("INVALID_CURSOR");
        cursor = String(next);
        if (seen.has(cursor)) throw new ConnectorError("CURSOR_LOOP"); seen.add(cursor);
      }
    }
    throw new ConnectorError("PAGE_LIMIT");
  }

  async fetchBatch(): Promise<RetailerIngestionBatch> {
    this.diagnostics = { requests: 0, retries: 0, pages: 0, records: 0, durationMs: 0 };
    const start = Date.now();
    try {
      if (readiness(this.config) !== "ready") throw new ConnectorError("SOURCE_NOT_READY");
      const stores = await this.collect(this.config.stores) as unknown as RetailerSourceStore[];
      const deals = await this.collect(this.config.deals) as unknown as RetailerSourceDeal[];
      if (this.config.fullSnapshot && !this.config.allowEmptySnapshot && deals.length === 0) throw new ConnectorError("EMPTY_SNAPSHOT_BLOCKED");
      const batch = { source: this.source, stores, deals, fetchedAt: new Date().toISOString(), fullSnapshot: this.config.fullSnapshot };
      validateBatch(batch); return batch;
    } finally { this.diagnostics.durationMs = Date.now() - start; }
  }
}
