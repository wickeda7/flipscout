CREATE TABLE IF NOT EXISTS discovery_search_cache (
  cache_key text PRIMARY KEY,
  zip_code varchar(5) NOT NULL,
  retailer text NOT NULL,
  scope jsonb NOT NULL,
  result jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '12 hours'),
  CHECK (zip_code ~ '^[0-9]{5}$')
);
CREATE INDEX IF NOT EXISTS discovery_cache_zip_retailer_idx
  ON discovery_search_cache (zip_code, retailer, expires_at);
