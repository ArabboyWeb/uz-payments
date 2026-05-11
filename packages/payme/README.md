# @uz-payments/payme

Payme Merchant API provider for `uz-payments`.

This package validates Payme callback payloads, verifies Basic auth, formats
Payme RPC responses, and delegates all business state changes to typed
application callbacks.

## Install

```bash
pnpm add @uz-payments/core @uz-payments/payme
```

## Usage

```ts
import { PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!,
  basicAuthUsername: process.env.PAYME_AUTH_LOGIN
});

const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const order = await db.orders.findById(String(ctx.account.order_id ?? ""));

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND", data: "order_id" };
    }

    if (order.amountTiyin !== ctx.amount) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    return { ok: true };
  },
  async createTransaction(ctx) {
    return db.payments.createPaymeTransaction(ctx);
  },
  async performTransaction(ctx) {
    return db.payments.performPaymeTransaction(ctx.transactionId);
  },
  async cancelTransaction(ctx) {
    return db.payments.cancelPaymeTransaction(ctx.transactionId, ctx.reason);
  },
  async checkTransaction(ctx) {
    return db.payments.getPaymeTransaction(ctx.transactionId);
  },
  async getStatement(ctx) {
    return db.payments.getPaymeStatement(ctx.from, ctx.to);
  }
};

const response = await payme.handleRequest(payload, headers, callbacks);
```

## Production Notes

- Payme amounts are positive integer tiyin values.
- Provider callbacks can be retried; create, perform, cancel, and check logic
  must be idempotent.
- The handler never writes to your database directly.
- Keep Payme credentials in server-side environment variables only.
- Verify behavior in Payme Business sandbox before production use.

See `docs/payme-production-checklist.md` and `docs/payme-validation-report.md`
in the repository.

## License

MIT
