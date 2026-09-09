import type {
  IngestionRunSummary,
  IngestionStatusResponse,
} from "@flipscout/types";
import type { IngestionStatusProvider } from "./ingestion-status-provider.js";

export class MemoryIngestionStatusProvider
  implements IngestionStatusProvider
{
  async getStatus(): Promise<IngestionStatusResponse> {
    return {
      generatedAt: new Date().toISOString(),
      staleAfterMinutes: 180,
      sources: [
        {
          source: "mock",
          activeDeals: 6,
          inactiveDeals: 0,
          stores: 6,
          lastSeenAt: null,
          latestRun: null,
          freshness: "unknown",
        },
      ],
    };
  }

  async listRuns(_limit = 20): Promise<IngestionRunSummary[]> {
    return [];
  }
}
