import type { Pool } from "pg";
import type { WatchlistItem } from "@flipscout/types";
import type { WatchlistProvider } from "./watchlist-provider.js";

export class PostgresWatchlistProvider implements WatchlistProvider {
  constructor(private readonly pool: Pool) {}

  async list(userId: string): Promise<WatchlistItem[]> {
    const result = await this.pool.query<{
      deal_id: string;
      created_at: Date | string;
    }>(
      `
      SELECT deal_id::text, created_at
      FROM watchlist_items
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map((row) => ({
      dealId: row.deal_id,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
    }));
  }

  async add(userId: string, dealId: string): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO watchlist_items (user_id, deal_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, deal_id) DO NOTHING
      `,
      [userId, dealId],
    );
  }

  async remove(userId: string, dealId: string): Promise<void> {
    await this.pool.query(
      "DELETE FROM watchlist_items WHERE user_id = $1 AND deal_id = $2",
      [userId, dealId],
    );
  }

  async clear(userId: string): Promise<void> {
    await this.pool.query(
      "DELETE FROM watchlist_items WHERE user_id = $1",
      [userId],
    );
  }
}
