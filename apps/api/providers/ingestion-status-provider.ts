import type {
  IngestionRunSummary,
  IngestionStatusResponse,
} from "@flipscout/types";

export interface IngestionStatusProvider {
  getStatus(): Promise<IngestionStatusResponse>;
  listRuns(limit?: number): Promise<IngestionRunSummary[]>;
}
