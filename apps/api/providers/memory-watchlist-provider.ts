import type { WatchlistItem } from "@flipscout/types";
import type { WatchlistProvider } from "./watchlist-provider.js";

export class MemoryWatchlistProvider implements WatchlistProvider {
  private readonly data = new Map<string, Map<string, WatchlistItem>>();

  async list(userId: string): Promise<WatchlistItem[]> {
    return [...(this.data.get(userId)?.values() ?? [])].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  async add(userId: string, dealId: string): Promise<void> {
    const userItems = this.data.get(userId) ?? new Map<string, WatchlistItem>();
    userItems.set(dealId, {
      dealId,
      createdAt: new Date().toISOString(),
    });
    this.data.set(userId, userItems);
  }

  async remove(userId: string, dealId: string): Promise<void> {
    this.data.get(userId)?.delete(dealId);
  }

  async clear(userId: string): Promise<void> {
    this.data.delete(userId);
  }
}
