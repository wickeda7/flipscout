import type { WatchlistItem } from "@flipscout/types";

export interface WatchlistProvider {
  list(userId: string): Promise<WatchlistItem[]>;
  add(userId: string, dealId: string): Promise<void>;
  remove(userId: string, dealId: string): Promise<void>;
  clear(userId: string): Promise<void>;
}
