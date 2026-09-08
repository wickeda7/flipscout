import type {
  RetailerIngestionBatch,
  RetailerSource,
} from "@flipscout/types";

export interface RetailerAdapter {
  readonly source: RetailerSource;
  fetchBatch(): Promise<RetailerIngestionBatch>;
}
