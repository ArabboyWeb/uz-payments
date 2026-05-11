import express from "express";
import { createPaymeExpressHandler } from "@uz-payments/express";
import { PaymeMerchantError, PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";

import { db } from "./mock-db";

const app = express();

app.use(express.json({ limit: "1mb" }));

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID ?? "",
  secretKey: process.env.PAYME_SECRET_KEY ?? ""
});

const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const orderId = String(ctx.account.order_id ?? "");
    const order = await db.orders.findById(orderId);

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND", data: "order_id" };
    }

    if (order.amountTiyin !== ctx.amount) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    if (order.paid) {
      return { ok: false, reason: "CANNOT_PERFORM" };
    }

    return { ok: true };
  },

  async createTransaction(ctx) {
    const orderId = String(ctx.account.order_id ?? "");
    const createTime = Date.now();

    const transaction = await db.transactions.create({
      provider: "payme",
      providerTransactionId: ctx.transactionId,
      orderId,
      amountTiyin: ctx.amount,
      state: "CREATED",
      createTime,
      rawPayload: ctx.rawPayload as unknown as Record<string, unknown>
    });

    return { create_time: transaction.createTime, state: 1 };
  },

  async performTransaction(ctx) {
    const transaction = await db.transactions.findByProviderId(ctx.transactionId);
    if (!transaction) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    const performTime = transaction.performTime ?? Date.now();
    await db.withPaymentTransaction(async () => {
      await db.transactions.markConfirmed(ctx.transactionId, performTime);
      await db.orders.markPaid(transaction.orderId);
      await db.audit.record({
        provider: "payme",
        event: "payme.perform.confirmed",
        providerTransactionId: ctx.transactionId,
        orderId: transaction.orderId,
        safePayload: { performTime }
      });
    });

    return { perform_time: performTime, state: 2 };
  },

  async cancelTransaction(ctx) {
    const transaction = await db.transactions.findByProviderId(ctx.transactionId);
    if (!transaction) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    const previousState = transaction.state;
    const cancelTime = transaction.cancelTime ?? Date.now();
    await db.withPaymentTransaction(async () => {
      await db.transactions.cancel(ctx.transactionId, cancelTime);
      await db.audit.record({
        provider: "payme",
        event: "payme.cancel.stored",
        providerTransactionId: ctx.transactionId,
        orderId: transaction.orderId,
        safePayload: { cancelTime, reason: ctx.reason }
      });
    });

    return { cancel_time: cancelTime, state: previousState === "CONFIRMED" ? -2 : -1 };
  },

  async checkTransaction(ctx) {
    const transaction = await db.transactions.findByProviderId(ctx.transactionId);
    if (!transaction) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    return {
      create_time: transaction.createTime,
      perform_time: transaction.performTime,
      cancel_time: transaction.cancelTime,
      state: transaction.state === "CONFIRMED" ? 2 : transaction.state === "CANCELLED" ? -1 : 1
    };
  },

  async getStatement(ctx) {
    const transactions = await db.transactions.statement(ctx.from, ctx.to);

    return {
      transactions: transactions.map((transaction) => ({
        id: transaction.providerTransactionId,
        time: transaction.createTime,
        amount: transaction.amountTiyin,
        account: { order_id: transaction.orderId },
        create_time: transaction.createTime,
        perform_time: transaction.performTime,
        cancel_time: transaction.cancelTime,
        transaction: transaction.providerTransactionId,
        state: transaction.state === "CONFIRMED" ? 2 : transaction.state === "CANCELLED" ? -1 : 1
      }))
    };
  }
};

app.post("/payme", createPaymeExpressHandler(payme, callbacks));

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Express Payme example listening on http://localhost:${port}`);
});
