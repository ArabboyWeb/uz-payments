# Database

Use durable database storage for payment state. Do not use memory stores for
production payment transactions, idempotency, or audit records.

## PostgreSQL Schema

```sql
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
```

## Notes

- Store amounts in tiyin to avoid floating point money bugs.
- Keep `provider_transaction_id` unique per provider to support idempotency and
  safe repeated provider requests.
- Store raw provider payloads only after redacting secrets where needed. They are
  useful for audit/debugging and dispute investigation.
- Provider handlers must be idempotent because payment providers can retry the
  same request.
- Secrets must not be logged in `raw_payload`, `safe_payload`, application logs,
  traces, or error reports.
- Payment events need durable storage so server restarts do not lose transaction
  state.
