# @uz-payments/core

Core payment primitives for `uz-payments`.

This package is framework-agnostic and contains shared infrastructure types and
helpers for Uzbekistan-focused payment integrations.

## Install

```bash
pnpm add @uz-payments/core
```

## API

```ts
import {
  PaymentState,
  assertCanTransition,
  formatUZS,
  fromTiyin,
  toTiyin
} from "@uz-payments/core";

const amountTiyin = toTiyin(12500);
const amountUZS = fromTiyin(amountTiyin);
const label = formatUZS(amountTiyin);

const state: PaymentState = "CREATED";
assertCanTransition(state, "CONFIRMED");
```

## What It Provides

- safe UZS/tiyin conversion helpers
- generic payment state model
- typed SDK errors
- provider request and transaction contracts
- idempotency store contract
- safe audit event types

Amounts should be stored in tiyin. Do not store raw card data or provider
secrets in application logs.

## License

MIT
