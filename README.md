# uz-payments

TypeScript-first payment infrastructure SDK for Uzbekistan-focused applications.

`uz-payments` helps developers integrate Uzbekistan payment providers with safer
amount handling, typed provider callbacks, request validation, state modeling,
framework adapters, and production-oriented documentation.

This project is not affiliated with Payme, Click, Uzum, inPAY, Paynet, Apelsin,
any bank, or any other payment provider. Always verify integrations against the
provider's official documentation and sandbox before production use.

This SDK is a developer integration toolkit. It is not a payment processor, bank,
merchant account provider, or card processing system. It must never be used to
store raw card data or expose provider secrets to frontend code.

## Supported Providers

| Provider | Status |
|---|---|
| Payme | MVP implementation |
| Click | Planned |
| Uzum | Planned |
| inPAY | Planned |
| Paynet | Planned |
| Apelsin | Planned |
| Bank gateways | Research required |

Unsupported providers are documented only in the roadmap. They are not faked in
source code.

## Packages

```bash
pnpm add @uz-payments/core @uz-payments/payme
pnpm add @uz-payments/express
pnpm add @uz-payments/next
```

MVP workspace packages:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

Future providers should be added as separate packages only after official flows
are verified:

- `@uz-payments/click`
- `@uz-payments/uzum`
- `@uz-payments/inpay`
- `@uz-payments/paynet`
- `@uz-payments/apelsin`

## Quick Start

```ts
import { PaymentState, fromTiyin, toTiyin } from "@uz-payments/core";
import { PaymeProvider } from "@uz-payments/payme";

const amount = toTiyin(12500);
const display = fromTiyin(amount);
const state: PaymentState = "CREATED";

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!
});
```

Amounts are represented internally in tiyin. Never trust frontend-provided
amounts. Always load the order server-side and compare the provider amount with
the stored order amount.

## Payme Example

```ts
import { PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!
});

const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const order = await db.orders.findById(String(ctx.account.order_id ?? ""));

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND" };
    }

    if (order.amountTiyin !== ctx.amount) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    return { ok: true };
  },

  async createTransaction(ctx) {
    const existing = await db.transactions.findByProviderId(ctx.transactionId);
    if (existing) {
      return { create_time: existing.createTime, state: 1 };
    }

    await db.transactions.create({
      provider: "payme",
      providerTransactionId: ctx.transactionId,
      orderId: String(ctx.account.order_id ?? ""),
      amountTiyin: ctx.amount,
      state: "CREATED",
      rawPayload: ctx.rawPayload
    });

    return { create_time: Date.now(), state: 1 };
  },

  async performTransaction(ctx) {
    await db.transactions.markConfirmed(ctx.transactionId);
    await db.orders.markPaidByTransaction(ctx.transactionId);
    return { perform_time: Date.now(), state: 2 };
  },

  async cancelTransaction(ctx) {
    await db.transactions.cancel(ctx.transactionId);
    return { cancel_time: Date.now(), state: -1 };
  },

  async checkTransaction(ctx) {
    return db.transactions.toPaymeState(ctx.transactionId);
  },

  async getStatement(ctx) {
    return { transactions: await db.transactions.statement(ctx.from, ctx.to) };
  }
};

const response = await payme.handleRequest(payload, headers, callbacks);
```

The Payme handler validates JSON-RPC shape, method names, Basic auth, and params.
It never writes to your database directly. All business behavior lives in your
callbacks.

Verify exact Payme codes, edge cases, repeated request behavior, and sandbox
behavior against Payme's current official Merchant API documentation before
production use.

## Express

```ts
import express from "express";
import { createPaymeExpressHandler } from "@uz-payments/express";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.post("/payme", createPaymeExpressHandler(payme, callbacks));
```

See `examples/express-postgres`.

## Next.js App Router

```ts
import { createPaymeNextHandler } from "@uz-payments/next";
import { callbacks, payme } from "@/lib/payme";

export const runtime = "nodejs";
export const POST = createPaymeNextHandler(payme, callbacks);
```

See `examples/nextjs-app-router`.

## State Machine

Generic SDK states:

```txt
PENDING -> CHECKED -> CREATED -> CONFIRMED -> SETTLED
                            |             |
                            v             v
                       CANCELLED       REFUNDED
                            ^
                            |
                          FAILED
```

Allowed transitions:

- `PENDING -> CHECKED`
- `CHECKED -> CREATED`
- `CREATED -> CONFIRMED`
- `CONFIRMED -> SETTLED`
- `CREATED -> CANCELLED`
- `CREATED -> FAILED`
- `CONFIRMED -> REFUNDED`

Use `canTransition` for checks and `assertCanTransition` or
`transitionPaymentState` when invalid transitions should throw typed errors.

## Security Rules

1. Never store raw card data.
2. Never expose provider secrets to frontend.
3. Always verify webhook/request authentication.
4. Always use HTTPS in production.
5. Always check order amount server-side.
6. Always persist transaction before confirming business action.
7. Always make create/perform/cancel idempotent.
8. Always test in sandbox before production.
9. Never trust frontend amount/order data.
10. Log safely; do not log secrets.
11. Do not use in-memory stores for production payment state.
12. Keep provider credentials only in server-side environment variables.
13. Treat all provider callbacks as untrusted input until validated.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Documentation

- `docs/security.md`
- `docs/database.md`
- `docs/state-machine.md`
- `docs/provider-contract.md`
- `docs/provider-roadmap.md`
- `docs/production-checklist.md`

## Contributing

Provider packages require official documentation, known authentication flow,
documented request/webhook behavior, tested error mapping, idempotency notes,
and a sandbox or production-safe test strategy.

See `CONTRIBUTING.md`.

## License

MIT
