# Production Payme Integration Guide

This guide shows the production shape expected by `@uz-payments/payme`.

The SDK validates Payme requests and formats Payme responses. Your application
owns durable persistence, order validation, idempotency, audit logging, and
business state changes.

## Database

Start from `docs/database.md` and add application-specific order references.
The important payment table properties are:

- `provider = "payme"`
- `provider_transaction_id` unique per provider
- `amount_tiyin` stored as integer tiyin
- `state` stored durably
- `raw_payload` stored only when safe for your compliance policy
- audit events stored without secrets

Minimal SQL queries you should expect to support (PostgreSQL style):

```sql
-- Find by provider transaction ID (must be indexed/unique).
SELECT * FROM payment_transactions
WHERE provider = 'payme' AND provider_transaction_id = $1;

-- CreateTransaction (idempotent insert).
INSERT INTO payment_transactions (provider, provider_transaction_id, order_id, amount_tiyin, state, raw_payload)
VALUES ('payme', $provider_tx_id, $order_id, $amount_tiyin, 'CREATED', $raw_payload)
ON CONFLICT (provider, provider_transaction_id) DO NOTHING;

-- PerformTransaction (idempotent confirm).
UPDATE payment_transactions
SET state = 'CONFIRMED',
    perform_time = COALESCE(perform_time, $now_ms),
    updated_at = now()
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id;

-- CancelTransaction (idempotent cancel).
UPDATE payment_transactions
SET state = 'CANCELLED',
    cancel_time = COALESCE(cancel_time, $now_ms),
    updated_at = now()
WHERE provider = 'payme' AND provider_transaction_id = $provider_tx_id;
```

## Server-only Provider Setup

```ts
import { PaymeProvider } from "@uz-payments/payme";

export const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!,
  basicAuthUsername: process.env.PAYME_AUTH_LOGIN
});
```

Provider credentials must stay in server-side environment variables. Do not pass
them to frontend code.

## Callback Pattern

```ts
import { PaymeMerchantError, type PaymeCallbacks } from "@uz-payments/payme";

export const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const order = await db.orders.findById(String(ctx.account.order_id ?? ""));

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND", data: "order_id" };
    }

    if (order.amountTiyin !== ctx.amount) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    if (order.paid || order.cancelled) {
      return { ok: false, reason: "CANNOT_PERFORM" };
    }

    return { ok: true };
  },

  async createTransaction(ctx) {
    return db.tx(async (trx) => {
      const existing = await trx.payments.findByProviderId("payme", ctx.transactionId);
      if (existing) {
        return {
          create_time: existing.createTime,
          transaction: existing.providerTransactionId,
          state: 1
        };
      }

      const order = await trx.orders.findById(String(ctx.account.order_id ?? ""));
      if (!order) {
        throw new PaymeMerchantError("ORDER_NOT_FOUND", "order_id");
      }

      if (order.amountTiyin !== ctx.amount) {
        throw new PaymeMerchantError("INVALID_AMOUNT");
      }

      const payment = await trx.payments.create({
        provider: "payme",
        providerTransactionId: ctx.transactionId,
        orderId: order.id,
        amountTiyin: ctx.amount,
        state: "CREATED",
        rawPayload: ctx.rawPayload
      });

      await trx.audit.record("payme.create.stored", payment);
      return {
        create_time: payment.createTime,
        transaction: payment.providerTransactionId,
        state: 1
      };
    });
  },

  async performTransaction(ctx) {
    return db.tx(async (trx) => {
      const payment = await trx.payments.findByProviderId("payme", ctx.transactionId);
      if (!payment) {
        throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
      }

      if (payment.state === "CONFIRMED") {
        return {
          perform_time: payment.performTime,
          transaction: payment.providerTransactionId,
          state: 2
        };
      }

      await trx.payments.confirm(payment.id);
      await trx.orders.markPaid(payment.orderId);
      await trx.audit.record("payme.perform.confirmed", payment);

      const confirmed = await trx.payments.findById(payment.id);
      return {
        perform_time: confirmed.performTime,
        transaction: confirmed.providerTransactionId,
        state: 2
      };
    });
  },

  async cancelTransaction(ctx) {
    return db.tx(async (trx) => {
      const payment = await trx.payments.findByProviderId("payme", ctx.transactionId);
      if (!payment) {
        throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
      }

      if (payment.state === "CANCELLED") {
        return {
          cancel_time: payment.cancelTime,
          transaction: payment.providerTransactionId,
          state: -1
        };
      }

      await trx.payments.cancel(payment.id, ctx.reason);
      await trx.audit.record("payme.cancel.stored", payment);

      const cancelled = await trx.payments.findById(payment.id);
      return {
        cancel_time: cancelled.cancelTime,
        transaction: cancelled.providerTransactionId,
        state: -1
      };
    });
  },

  async checkTransaction(ctx) {
    const payment = await db.payments.findByProviderId("payme", ctx.transactionId);
    if (!payment) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    return db.payments.toPaymeCheckTransaction(payment);
  },

  async getStatement(ctx) {
    return {
      transactions: await db.payments.toPaymeStatement("payme", ctx.from, ctx.to)
    };
  }
};
```

The code above is intentionally ORM-neutral. Use your database client, but keep
the same guarantees: durable transaction writes, idempotent callbacks, safe audit
events, and no frontend secrets.

## Deployment Checklist

- Public HTTPS endpoint is configured.
- Payme Basic auth login and cashbox key are stored server-side.
- Sandbox scenarios in `docs/payme-validation-report.md` pass with real Payme
  Business sandbox traffic.
- Reconciliation job compares Payme `GetStatement` with local transactions.
- Logs redact secrets and authorization headers.
