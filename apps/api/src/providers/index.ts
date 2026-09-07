import { Pool } from "pg";
import type { DealProvider } from "./deal-provider.js";
import { MockDealProvider } from "./mock-deal-provider.js";
import { PostgresDealProvider } from "./postgres-deal-provider.js";

export type DataProviderName = "mock" | "postgres";

export function createDealProvider(): {
  name: DataProviderName;
  provider: DealProvider;
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
      provider: new PostgresDealProvider(pool),
    };
  }

  return {
    name: "mock",
    provider: new MockDealProvider(),
  };
}

export type { DealProvider, DealQuery } from "./deal-provider.js";
