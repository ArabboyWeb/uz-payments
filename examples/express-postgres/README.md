# Payme Express Example

> **Disclaimer:** This example is named `express-postgres` to demonstrate the architecture of a PostgreSQL-backed integration, but it internally uses a simplified mock in-memory array (`mock-db.ts`) for portability. It is **NOT** a real database implementation and should not be deployed to production as-is. Always use a durable database system in your production implementation.

This example shows how to wire `@uz-payments/payme` into an Express server.

The SDK handler does not write to your database. Your callbacks own order lookup,
transaction persistence, state changes, audit logging, and idempotency.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm --filter @uz-payments/core build
pnpm --filter @uz-payments/payme build
pnpm --filter @uz-payments/express build
tsx examples/express-postgres/src/server.ts
```

Use `schema.sql` as a starting point for production PostgreSQL tables.

## Production Pattern Shown

- `provider_transaction_id` is treated as idempotency key per provider.
- duplicate `CreateTransaction` returns the existing stored transaction.
- `PerformTransaction` updates payment state and order state inside one
  transaction boundary.
- `CancelTransaction` records the original cancellation result and returns it on
  repeated calls.
- audit events store only safe payloads, never secrets or raw card data.

The mock database is intentionally in-memory. Production systems must replace
`mock-db.ts` with durable PostgreSQL queries and real database transactions.

Never store raw card data and never put Payme secrets in frontend code.
