# Idempotency Guide

Payment providers can repeat requests when a response is lost or delayed. Your
merchant endpoint must be idempotent for all state-changing methods.

This SDK does not store payment state. Your application must implement durable
idempotency using a database, not memory.

## Database Constraints

Minimum PostgreSQL constraints for Payme-style callbacks:

```sql
-- Provider transaction ID must be unique per provider.
CREATE UNIQUE INDEX payment_transactions_provider_tx_id
  ON payment_transactions(provider, provider_transaction_id);
```

This unique index is the core guardrail that prevents duplicate `CreateTransaction`
rows when Payme retries.

## Transaction Pattern (SQL)

The goal is:

- write local transaction state before returning success to the provider
- return the stored result on duplicates (idempotent repeat)
- never mark an order paid before the transaction is durably confirmed

### `CreateTransaction`

Rules:

- if the provider transaction already exists, return its stored `create_time`
- otherwise insert a new row and return the inserted `create_time`

Pseudo-SQL shape:

```sql
BEGIN;

-- Validate the order server-side and compare amount in tiyin.
SELECT id, amount_tiyin, state FROM orders WHERE id = $order_id FOR UPDATE;

-- Idempotent insert. If it already exists, fetch existing row.
INSERT INTO payment_transactions (provider, provider_transaction_id, order_id, amount_tiyin, state, raw_payload)
VALUES ('payme', $provider_tx_id, $order_id, $amount_tiyin, 'CREATED', $raw_payload)
ON CONFLICT (provider, provider_transaction_id) DO NOTHING;

SELECT provider_transaction_id, created_at
FROM payment_transactions
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id;

COMMIT;
```

### `PerformTransaction`

Rules:

- if already performed, return stored `perform_time` and state `2`
- if not performed, update transaction to confirmed and mark order paid in the same DB transaction

Pseudo-SQL shape:

```sql
BEGIN;

SELECT id, order_id, state, perform_time
FROM payment_transactions
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id
FOR UPDATE;

-- If state is already CONFIRMED, return stored perform_time (idempotent repeat).

UPDATE payment_transactions
SET state = 'CONFIRMED', perform_time = COALESCE(perform_time, $now), updated_at = now()
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id;

UPDATE orders
SET paid = true, updated_at = now()
WHERE id = $order_id;

COMMIT;
```

### `CancelTransaction`

Rules:

- if already cancelled, return stored `cancel_time` (idempotent repeat)
- cancellation policy depends on provider rules and merchant business rules

Pseudo-SQL shape:

```sql
BEGIN;

SELECT id, order_id, state, cancel_time
FROM payment_transactions
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id
FOR UPDATE;

UPDATE payment_transactions
SET state = 'CANCELLED', cancel_time = COALESCE(cancel_time, $now), updated_at = now()
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id;

COMMIT;
```

## Safe Logging

- redact `Authorization` headers
- never log provider secrets
- do not store raw card data
- store raw callback payloads only if allowed by your compliance policy and with strict access control
