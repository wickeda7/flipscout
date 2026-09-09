import type { Pool } from "pg";
import { mockDeals } from "../mock-deals.js";

/** Refreshes only deterministic mock records; never touches accounts or real sources. */
export async function seedDemoInventory(pool: Pool) {
  const client = await pool.connect();
  const stores = new Map<string, string>();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(73621, hashtext('mock'))");
    for (const [index, deal] of mockDeals.entries()) {
      const key = JSON.stringify([deal.retailer, deal.storeName, deal.city, deal.state]);
      let storeId = stores.get(key);
      if (!storeId) {
        storeId = `10000000-0000-0000-0000-${String(stores.size + 1).padStart(12, "0")}`;
        const result = await client.query(`
          INSERT INTO stores (id,source,retailer,store_name,city,state,latitude,longitude,is_active,source_updated_at,last_seen_at)
          VALUES ($1,'mock',$2,$3,$4,$5,$6,$7,TRUE,NOW(),NOW())
          ON CONFLICT(id) DO UPDATE SET retailer=EXCLUDED.retailer,store_name=EXCLUDED.store_name,
            city=EXCLUDED.city,state=EXCLUDED.state,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,
            is_active=TRUE,source_updated_at=NOW(),last_seen_at=NOW(),updated_at=NOW()
          WHERE stores.source='mock' RETURNING id
        `,[storeId,deal.retailer,deal.storeName,deal.city,deal.state,deal.latitude,deal.longitude]);
        if (result.rows.length !== 1) throw new Error("Demo store ID belongs to another source; seed rolled back.");
        stores.set(key,storeId);
      }
      const id = `20000000-0000-0000-0000-${String(index + 1).padStart(12,"0")}`;
      const result = await client.query(`
        INSERT INTO deals (id,source,external_id,store_id,product_name,brand,category,
          retail_price,clearance_price,resale_price,marketplace_fee_percent,shipping_cost,other_costs,
          inventory,estimated_profit,roi,margin,break_even_price,buy_score,status,source_updated_at,last_seen_at,is_active)
        VALUES ($1,'mock',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW(),TRUE)
        ON CONFLICT(id) DO UPDATE SET product_name=EXCLUDED.product_name,brand=EXCLUDED.brand,
          category=EXCLUDED.category,store_id=EXCLUDED.store_id,retail_price=EXCLUDED.retail_price,
          clearance_price=EXCLUDED.clearance_price,resale_price=EXCLUDED.resale_price,
          marketplace_fee_percent=EXCLUDED.marketplace_fee_percent,shipping_cost=EXCLUDED.shipping_cost,
          other_costs=EXCLUDED.other_costs,inventory=EXCLUDED.inventory,estimated_profit=EXCLUDED.estimated_profit,
          roi=EXCLUDED.roi,margin=EXCLUDED.margin,break_even_price=EXCLUDED.break_even_price,
          buy_score=EXCLUDED.buy_score,status=EXCLUDED.status,source_updated_at=NOW(),last_seen_at=NOW(),
          is_active=TRUE,updated_at=NOW() WHERE deals.source='mock' RETURNING id
      `,[id,`demo-${index+1}`,storeId,deal.productName,deal.brand,deal.category,deal.retailPrice,
        deal.clearancePrice,deal.resalePrice,deal.marketplaceFeePercent,deal.shippingCost,deal.otherCosts,
        deal.inventory,deal.estimatedProfit,deal.roi,deal.margin,deal.breakEvenPrice,deal.buyScore,deal.status]);
      if (result.rows.length !== 1) throw new Error("Demo deal ID belongs to another source; seed rolled back.");
    }
    await client.query("COMMIT");
    return { source: "mock", stores: stores.size, deals: mockDeals.length };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { client.release(); }
}
