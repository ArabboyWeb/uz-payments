# Express + PostgreSQL Example

This example shows how to wire `@uz-payments/payme` into an Express server.

The SDK handler does not write to your database. Your callbacks own order lookup,
transaction persistence, state changes, and idempotency.

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

Never store raw card data and never put Payme secrets in frontend code.
