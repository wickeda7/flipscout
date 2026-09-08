import { validateBatch } from "./validation.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  RetailerIngestionBatch,
  RetailerIngestionResult,
  RetailerSourceDeal,
  RetailerSourceStore,
} from "@flipscout/types";
import {
  calculateBuyScore,
  calculateProfit,
  estimateResalePrice,
} from "@flipscout/core";

export async function ingestRetailerBatch(
  pool: Pool,
  batch: RetailerIngestionBatch,
): Promise<RetailerIngestionResult> {
  validateBatch(batch);
  const startedAt = new Date().toISOString();
  const client = await pool.connect();

  let storesUpserted = 0;
  let dealsUpserted = 0;
  let dealsSkipped = 0;

  try {
    await client.query("BEGIN");

    const storeIds = new Map<string, string>();

    for (const store of batch.stores) {
      validateStore(store);
      const storeId = await upsertStore(client, store);
      storeIds.set(store.externalStoreId, storeId);
      storesUpserted += 1;
    }

    for (const deal of batch.deals) {
      await upsertDeal(client, storeIds.get(deal.externalStoreId)!, deal);
      dealsUpserted += 1;
    }

    if (batch.fullSnapshot) {
      await client.query(
        `
        UPDATE deals
        SET is_active = FALSE,
            updated_at = NOW()
        WHERE source = $1
          AND is_active = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_to_recordset($2::jsonb) AS seen(store_id text, external_id text)
            WHERE seen.store_id = deals.store_id::text AND seen.external_id = deals.external_id
          )
        `,
        [batch.source, JSON.stringify(batch.deals.map(d => ({ store_id: storeIds.get(d.externalStoreId), external_id: d.externalDealId })))],
      );
    }

    await client.query(
      `
      INSERT INTO ingestion_runs (
        id,
        source,
        status,
        fetched_at,
        stores_upserted,
        deals_upserted,
        deals_skipped,
        started_at,
        completed_at
      )
      VALUES ($1, $2, 'completed', $3, $4, $5, $6, $7, NOW())
      `,
      [
        randomUUID(),
        batch.source,
        batch.fetchedAt,
        storesUpserted,
        dealsUpserted,
        dealsSkipped,
        startedAt,
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve original ingestion error.
    }

    await pool
      .query(
        `
        INSERT INTO ingestion_runs (
          id,
          source,
          status,
          fetched_at,
          stores_upserted,
          deals_upserted,
          deals_skipped,
          started_at,
          completed_at,
          error_message
        )
        VALUES ($1, $2, 'failed', $3, $4, $5, $6, $7, NOW(), $8)
        `,
        [
          randomUUID(),
          batch.source,
          batch.fetchedAt,
          storesUpserted,
          dealsUpserted,
          dealsSkipped,
          startedAt,
          "PERSISTENCE_FAILED",
        ],
      )
      .catch(() => undefined);

    throw error;
  } finally {
    client.release();
  }

  return {
    source: batch.source,
    storesUpserted,
    dealsUpserted,
    dealsSkipped,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}

async function upsertStore(
  client: PoolClient,
  store: RetailerSourceStore,
): Promise<string> {
  const id = randomUUID();

  const result = await client.query<{ id: string }>(
    `
    INSERT INTO stores (
      id,
      source,
      external_store_id,
      retailer,
      retailer_store_id,
      store_name,
      city,
      state,
      latitude,
      longitude,
      source_updated_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $3, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (source, external_store_id)
    DO UPDATE SET
      retailer = EXCLUDED.retailer,
      retailer_store_id = EXCLUDED.retailer_store_id,
      store_name = EXCLUDED.store_name,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      source_updated_at = NOW(),
      updated_at = NOW()
    RETURNING id::text
    `,
    [
      id,
      store.source,
      store.externalStoreId,
      store.retailer,
      store.storeName,
      store.city,
      store.state,
      store.latitude,
      store.longitude,
    ],
  );

  return result.rows[0].id;
}

async function upsertDeal(
  client: PoolClient,
  storeId: string,
  deal: RetailerSourceDeal,
): Promise<void> {
  const resalePrice = estimateResalePrice({
    retailPrice: deal.retailPrice,
    clearancePrice: deal.clearancePrice,
    suppliedResalePrice: deal.resalePrice,
  });

  const feePercent = deal.marketplaceFeePercent ?? 13.25;
  const shippingCost = deal.shippingCost ?? 10;
  const otherCosts = deal.otherCosts ?? 0;

  const profit = calculateProfit({
    purchasePrice: deal.clearancePrice,
    resalePrice,
    marketplaceFeePercent: feePercent,
    marketplaceFeeFlat: 0.3,
    shippingCost,
    otherCosts,
  });

  const discountPercent =
    deal.retailPrice > 0
      ? ((deal.retailPrice - deal.clearancePrice) / deal.retailPrice) * 100
      : 0;

  const score = calculateBuyScore({
    roiPercent: profit.roiPercent,
    netProfit: profit.netProfit,
    discountPercent,
    inventory: deal.inventory,
    distanceMiles: 0,
  });

  await client.query(
    `
    INSERT INTO deals (
      id,
      source,
      external_id,
      store_id,
      product_name,
      brand,
      category,
      retail_price,
      clearance_price,
      resale_price,
      marketplace_fee_percent,
      shipping_cost,
      other_costs,
      inventory,
      estimated_profit,
      roi,
      margin,
      break_even_price,
      buy_score,
      status,
      source_updated_at,
      source_url,
      sku,
      upc,
      last_seen_at,
      is_active,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, NOW(), TRUE, NOW()
    )
    ON CONFLICT (source, external_id, store_id)
    DO UPDATE SET
      product_name = EXCLUDED.product_name,
      brand = EXCLUDED.brand,
      category = EXCLUDED.category,
      retail_price = EXCLUDED.retail_price,
      clearance_price = EXCLUDED.clearance_price,
      resale_price = EXCLUDED.resale_price,
      marketplace_fee_percent = EXCLUDED.marketplace_fee_percent,
      shipping_cost = EXCLUDED.shipping_cost,
      other_costs = EXCLUDED.other_costs,
      inventory = EXCLUDED.inventory,
      estimated_profit = EXCLUDED.estimated_profit,
      roi = EXCLUDED.roi,
      margin = EXCLUDED.margin,
      break_even_price = EXCLUDED.break_even_price,
      buy_score = EXCLUDED.buy_score,
      status = EXCLUDED.status,
      source_updated_at = EXCLUDED.source_updated_at,
      source_url = EXCLUDED.source_url,
      sku = EXCLUDED.sku,
      upc = EXCLUDED.upc,
      last_seen_at = NOW(),
      is_active = TRUE,
      updated_at = NOW()
    `,
    [
      randomUUID(),
      deal.source,
      deal.externalDealId,
      storeId,
      deal.productName,
      deal.brand,
      deal.category,
      deal.retailPrice,
      deal.clearancePrice,
      resalePrice,
      feePercent,
      shippingCost,
      otherCosts,
      deal.inventory,
      profit.netProfit,
      profit.roiPercent,
      profit.marginPercent,
      profit.breakEvenPrice,
      score.score,
      score.label === "STRONG BUY"
        ? "strong-buy"
        : score.label === "BUY"
          ? "buy"
          : score.label === "MAYBE"
            ? "maybe"
            : "skip",
      deal.sourceUpdatedAt,
      deal.sourceUrl ?? null,
      deal.sku ?? null,
      deal.upc ?? null,
    ],
  );
}

function validateStore(store: RetailerSourceStore) {
  if (!store.externalStoreId.trim()) {
    throw new Error("externalStoreId is required.");
  }

  if (!store.storeName.trim()) {
    throw new Error("storeName is required.");
  }

  if (
    !Number.isFinite(store.latitude) ||
    store.latitude < -90 ||
    store.latitude > 90 ||
    !Number.isFinite(store.longitude) ||
    store.longitude < -180 ||
    store.longitude > 180
  ) {
    throw new Error("Store coordinates are invalid.");
  }
}
