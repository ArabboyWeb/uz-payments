# Reconciliation

Reconciliation is the process of comparing provider-side payment records with
your local transaction records. Merchants should run it regularly, even when all
webhooks appear healthy.

## Why It Matters

Provider callbacks can be retried, delayed, or interrupted by network failures.
Local services can fail after a provider request is received. Reconciliation
finds mismatches before they become accounting, fulfillment, or customer support
issues.

## Data Sources

Use at least two sources:

- Payme `GetStatement` responses for a time window.
- Local `payment_transactions` rows for the same provider and time window.

For Payme, the official docs require `GetStatement` to return transactions that
were successfully created by `CreateTransaction`, filtered by Payme creation time
using `from <= time <= to`, sorted ascending.

## Recommended Local Fields

- `provider`
- `provider_transaction_id`
- `order_id`
- `amount_tiyin`
- `state`
- `raw_payload`
- `created_at`
- `updated_at`
- provider creation time from `CreateTransaction.params.time`
- local `create_time`, `perform_time`, `cancel_time`, and `reason`

## Comparison Rules

For each Payme statement transaction:

- Match by `provider = "payme"` and `provider_transaction_id = statement.id`.
- Compare `amount_tiyin` with `statement.amount`.
- Compare provider state with the mapped local state.
- Compare `create_time`, `perform_time`, `cancel_time`, and `reason`.
- Confirm the linked order state matches the payment state.

For each local transaction in the same window:

- Confirm it appears in Payme `GetStatement` if `CreateTransaction` succeeded.
- Investigate local successful payments missing from provider statements.
- Investigate provider completed payments where the local order is not paid.
- Investigate provider cancelled payments where the local order is fulfilled.

## Handling Mismatches

Use a manual review queue for mismatches. Do not automatically reverse or fulfill
orders without an operator-visible audit trail.

Recommended mismatch categories:

- `missing_local_transaction`
- `missing_provider_transaction`
- `amount_mismatch`
- `state_mismatch`
- `order_state_mismatch`
- `timestamp_mismatch`

Each reconciliation run should write an audit event with safe payloads only. Do
not log authorization headers, provider secrets, customer card data, or full
unredacted request bodies.

## Operational Cadence

- Run short-window reconciliation every 5 to 15 minutes for recent transactions.
- Run daily reconciliation for the previous business day.
- Keep enough history to investigate refunds, chargebacks, support tickets, and
  accounting discrepancies.

## Production Notes

- Reconciliation should be idempotent.
- Use database transactions when marking mismatches resolved.
- Keep raw provider payloads available for debugging, but redact secrets.
- Document who can manually mark a mismatch as resolved.
