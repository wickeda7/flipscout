import { Pool } from "pg";
import type { AuthProvider } from "./auth-provider.js";
import { MemoryAuthProvider } from "./memory-auth-provider.js";
import { PostgresAuthProvider } from "./postgres-auth-provider.js";
import type { DealProvider } from "./deal-provider.js";
import { MockDealProvider } from "./mock-deal-provider.js";
import { PostgresDealProvider } from "./postgres-deal-provider.js";
import { MemoryWatchlistProvider } from "./memory-watchlist-provider.js";
import { PostgresWatchlistProvider } from "./postgres-watchlist-provider.js";
import type { WatchlistProvider } from "./watchlist-provider.js";
import type { IngestionStatusProvider } from "./ingestion-status-provider.js";
import { MemoryIngestionStatusProvider } from "./memory-ingestion-status-provider.js";
import { PostgresIngestionStatusProvider } from "./postgres-ingestion-status-provider.js";

export type DataProviderName = "mock" | "postgres";

export function createProviders(): {
  name: DataProviderName;
  dealProvider: DealProvider;
  watchlistProvider: WatchlistProvider;
  authProvider: AuthProvider;
  ingestionStatusProvider: IngestionStatusProvider;
} {
  const requested = (process.env.DATA_PROVIDER ?? "mock").toLowerCase();

  if (requested === "postgres") {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATA_PROVIDER=postgres requires DATABASE_URL to be configured.",
      );
    }

    const pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });

    return {
      name: "postgres",
      dealProvider: new PostgresDealProvider(pool),
      watchlistProvider: new PostgresWatchlistProvider(pool),
      authProvider: new PostgresAuthProvider(pool),
      ingestionStatusProvider: new PostgresIngestionStatusProvider(pool),
    };
  }

  return {
    name: "mock",
    dealProvider: new MockDealProvider(),
    watchlistProvider: new MemoryWatchlistProvider(),
    authProvider: new MemoryAuthProvider(),
    ingestionStatusProvider: new MemoryIngestionStatusProvider(),
  };
}

export type { AuthProvider } from "./auth-provider.js";
export type { DealProvider, DealQuery } from "./deal-provider.js";
export type { WatchlistProvider } from "./watchlist-provider.js";

export type { IngestionStatusProvider } from "./ingestion-status-provider.js";
