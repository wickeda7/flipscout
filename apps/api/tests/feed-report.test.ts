import { test } from "node:test";
import assert from "node:assert/strict";
import { feedReport } from "../src/ingestion/feed-report.js";
import type { RetailerIngestionBatch } from "@flipscout/types";
const now = Date.parse("2026-09-09T12:00:00Z");
function batch(): RetailerIngestionBatch {
  return { source: "fixture", fetchedAt: new Date(now).toISOString(), fullSnapshot: false,
    stores: [{ source: "fixture", externalStoreId: "001", retailer: "Fixture", storeName: "Test", city: "City", state: "ST", latitude: 0, longitude: 0 }],
    deals: [{ source: "fixture", externalDealId: "001", externalStoreId: "001", productName: "Private fixture", brand: "Fixture", category: "Tools", retailPrice: 50, clearancePrice: 20, inventory: 2, sourceUpdatedAt: new Date(now).toISOString(), sku: "private-sku", sourceUrl: "https://example.invalid/private" }] };
}
test("fresh feed reports aggregate field coverage without exposing payloads", () => {
  const b = batch(), before = structuredClone(b);
  const report = feedReport(b,180,now);
  assert.equal(report.status,"validated"); assert.equal(report.freshInStockDeals,1);
  assert.equal(report.coverage.sku,1); assert.equal(report.coverage.sourceUrl,1);
  assert.deepEqual(b,before);
  assert.doesNotMatch(JSON.stringify(report),/private|https:/i);
});
test("stale and future inventory cannot pass preflight as usable inventory", () => {
  for (const offset of [-181*60000, 6*60000]) {
    const b=batch(); b.deals[0].sourceUpdatedAt=new Date(now+offset).toISOString();
    const r=feedReport(b,180,now); assert.equal(r.status,"needs-review"); assert.equal(r.freshInStockDeals,0);
    assert.ok(r.warnings.includes(offset<0?"STALE_INVENTORY":"FUTURE_TIMESTAMPS"));
  }
});
test("empty and out-of-stock feeds report review; full snapshots flag deactivation", () => {
  const b=batch(); b.fullSnapshot=true; b.deals[0].inventory=0;
  assert.equal(feedReport(b,180,now).zeroInventoryDeals,1);
  assert.equal(feedReport(b,180,now).status,"needs-review");
  assert.ok(feedReport(b,180,now).warnings.includes("FULL_SNAPSHOT_CAN_DEACTIVATE_MISSING_DEALS"));
  b.deals=[]; const r=feedReport(b,180,now); assert.equal(r.oldestInventoryAt,null); assert.equal(r.storesWithoutDeals,1);
});
test("invalid inventory and thresholds fail without a misleading report", () => {
  assert.throws(()=>feedReport(batch(),NaN,now),/INVALID_REPORT_OPTIONS/);
  const b=batch(); b.deals[0].externalStoreId="missing"; assert.throws(()=>feedReport(b,180,now),/INVALID_BATCH/);
});
