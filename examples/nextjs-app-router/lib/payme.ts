import { PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";

import { db } from "./mock-db";

export const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID ?? "",
  secretKey: process.env.PAYME_SECRET_KEY ?? ""
});

export const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const orderId = String(ctx.account.order_id ?? "");
    const order = await db.findOrder(orderId);

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND" };
    }

    if (order.amountTiyin !== ctx.amount) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    return order.paid ? { ok: false, reason: "CANNOT_PERFORM" } : { ok: true };
  },

  async createTransaction(ctx) {
    const transaction = await db.upsertTransaction({
      id: ctx.transactionId,
      orderId: String(ctx.account.order_id ?? ""),
      amountTiyin: ctx.amount,
      state: "CREATED",
      createTime: Date.now()
    });

    return { create_time: transaction.createTime, state: 1 };
  },

  async performTransaction(ctx) {
    const now = Date.now();
    const transaction = await db.setTransactionState(ctx.transactionId, "CONFIRMED", "performTime", now);

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await db.markOrderPaid(transaction.orderId);
    return { perform_time: transaction.performTime ?? now, state: 2 };
  },

  async cancelTransaction(ctx) {
    const now = Date.now();
    const transaction = await db.setTransactionState(ctx.transactionId, "CANCELLED", "cancelTime", now);

    return { cancel_time: transaction?.cancelTime ?? now, state: -1 };
  },

  async checkTransaction(ctx) {
    const transaction = await db.findTransaction(ctx.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    return {
      create_time: transaction.createTime,
      perform_time: transaction.performTime,
      cancel_time: transaction.cancelTime,
      state: transaction.state === "CONFIRMED" ? 2 : transaction.state === "CANCELLED" ? -1 : 1
    };
  },

  async getStatement(ctx) {
    const transactions = await db.statement(ctx.from, ctx.to);

    return {
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        time: transaction.createTime,
        amount: transaction.amountTiyin,
        account: { order_id: transaction.orderId },
        create_time: transaction.createTime,
        perform_time: transaction.performTime,
        cancel_time: transaction.cancelTime,
        transaction: transaction.id,
        state: transaction.state === "CONFIRMED" ? 2 : transaction.state === "CANCELLED" ? -1 : 1
      }))
    };
  }
};
