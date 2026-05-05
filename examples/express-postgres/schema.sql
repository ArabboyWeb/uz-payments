CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount_tiyin BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS',
  state TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_transaction_id)
);

CREATE TABLE payment_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event TEXT NOT NULL,
  provider_transaction_id TEXT,
  order_id TEXT,
  safe_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
