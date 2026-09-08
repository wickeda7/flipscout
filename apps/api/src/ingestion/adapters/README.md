# Retailer adapters

Retailer-specific integrations belong here. Each adapter implements
`RetailerAdapter` and returns a normalized `RetailerIngestionBatch`.

Do not put retailer-specific fields, scraping assumptions, authentication, or
business-score logic into the shared DealProvider or web/mobile clients.

A real adapter should:

1. fetch from an authorized retailer/API/data source;
2. normalize stores and deals to the shared ingestion contracts;
3. preserve stable external store/deal identifiers;
4. set `sourceUpdatedAt` from the upstream source when available;
5. set `fullSnapshot=true` only when the batch is a complete source snapshot;
6. never calculate BUY score itself—the ingestion service does that centrally.

Register new adapters in `adapter-registry.ts`.

The included `MockRetailerAdapter` exists only to exercise the ingestion
pipeline. Home Depot, Lowe's, Walmart, Target, Costco, and Dollar General
connectors are intentionally not faked here. Each should be added only when a
supported/authorized data source has been selected.
