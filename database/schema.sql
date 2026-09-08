-- FlipScout shared PostgreSQL foundation.
-- Phase 3 will connect the API to these tables; Phase 2 data remains mocked.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  password_hash TEXT,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'en'
    CHECK (locale IN ('en', 'vi')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'mock',
  external_store_id TEXT,
  retailer TEXT NOT NULL,
  retailer_store_id TEXT,
  store_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source_updated_at TIMESTAMPTZ,
  source_url TEXT,
  sku TEXT,
  upc TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'mock',
  external_id TEXT,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  retail_price NUMERIC(12,2) NOT NULL,
  clearance_price NUMERIC(12,2) NOT NULL,
  resale_price NUMERIC(12,2) NOT NULL,
  marketplace_fee_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  inventory INTEGER NOT NULL DEFAULT 0,
  estimated_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  roi NUMERIC(12,4) NOT NULL DEFAULT 0,
  margin NUMERIC(12,4) NOT NULL DEFAULT 0,
  break_even_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  buy_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (
    status IN ('strong-buy', 'buy', 'maybe', 'skip')
  ),
  source_updated_at TIMESTAMPTZ,
  source_url TEXT,
  sku TEXT,
  upc TEXT,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, deal_id)
);

CREATE INDEX IF NOT EXISTS deals_store_id_idx ON deals(store_id);
CREATE INDEX IF NOT EXISTS deals_category_idx ON deals(category);
CREATE INDEX IF NOT EXISTS deals_buy_score_idx ON deals(buy_score DESC);
CREATE INDEX IF NOT EXISTS watchlist_user_id_idx ON watchlist_items(user_id);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_id_idx ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS email_verification_tokens_expires_at_idx ON email_verification_tokens(expires_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;


CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  fetched_at TIMESTAMPTZ,
  stores_upserted INTEGER NOT NULL DEFAULT 0,
  deals_upserted INTEGER NOT NULL DEFAULT 0,
  deals_skipped INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  error_message TEXT
);

ALTER TABLE stores ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'mock';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS external_store_id TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'mock';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS upc TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS stores_source_external_id_uidx ON stores(source, external_store_id);
CREATE UNIQUE INDEX IF NOT EXISTS deals_source_external_store_uidx ON deals(source, external_id, store_id);
CREATE INDEX IF NOT EXISTS deals_last_seen_at_idx ON deals(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS deals_is_active_idx ON deals(is_active);
CREATE INDEX IF NOT EXISTS ingestion_runs_source_started_idx ON ingestion_runs(source, started_at DESC);
