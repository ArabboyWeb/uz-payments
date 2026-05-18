import { PaymeMerchantError, PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";
import type { PaymeTransactionState } from "@uz-payments/payme";

import { db } from "./mock-db";

export const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID ?? "",
  secretKey: process.env.PAYME_SECRET_KEY ?? ""
});

/**
 * Map local payment state to Payme transaction state integer.
 *
 * Payme states:
 *  1  = created
 *  2  = confirmed (performed)
 * -1  = cancelled from created state
 * -2  = cancelled after confirmed (refunded through Payme)
 */
function toPaymeState(
  localState: string,
  wasPerformed: boolean
): PaymeTransactionState {
  switch (localState) {
    case "CONFIRMED":
      return 2;
    case "CANCELLED":
      return wasPerformed ? -2 : -1;
    default:
      return 1;
  }
}

export const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const orderId = String(ctx.account.order_id ?? "");
    const order = await db.findOrder(orderId);

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND", data: "order_id" };
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
      // Store the provider-issued creation time so reconciliation via GetStatement is consistent.
      createTime: ctx.providerTime,
      rawPayload: ctx.rawPayload as unknown as Record<string, unknown>
    });

    return { create_time: transaction.createTime, state: 1 };
  },

  async performTransaction(ctx) {
    const now = Date.now();
    const transaction = await db.withPaymentTransaction(async () => {
      const updated = await db.setTransactionState(
        ctx.transactionId,
        "CONFIRMED",
        "performTime",
        now
      );
      if (updated) {
        await db.markOrderPaid(updated.orderId);
        await db.recordAudit({
          event: "payme.perform.confirmed",
          providerTransactionId: ctx.transactionId,
          orderId: updated.orderId,
          safePayload: { performTime: updated.performTime ?? now }
        });
      }
      return updated;
    });

    if (!transaction) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    return { perform_time: transaction.performTime ?? now, state: 2 };
  },

  async cancelTransaction(ctx) {
    const now = Date.now();
    const existing = await db.findTransaction(ctx.transactionId);
    if (!existing) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    const wasPerformed = existing.performTime !== undefined;
    const transaction = await db.withPaymentTransaction(async () => {
      const updated = await db.setTransactionState(
        ctx.transactionId,
        "CANCELLED",
        "cancelTime",
        now,
        ctx.reason
      );
      if (updated) {
        await db.recordAudit({
          event: "payme.cancel.stored",
          providerTransactionId: ctx.transactionId,
          orderId: updated.orderId,
          safePayload: { cancelTime: updated.cancelTime ?? now, reason: ctx.reason }
        });
      }
      return updated;
    });

    return {
      cancel_time: transaction?.cancelTime ?? now,
      state: toPaymeState("CANCELLED", wasPerformed)
    };
  },

  async checkTransaction(ctx) {
    const transaction = await db.findTransaction(ctx.transactionId);
    if (!transaction) {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    }

    return {
      create_time: transaction.createTime,
      perform_time: transaction.performTime,
      cancel_time: transaction.cancelTime,
      state: toPaymeState(transaction.state, transaction.performTime !== undefined),
      reason: transaction.reason
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
        state: toPaymeState(transaction.state, transaction.performTime !== undefined),
        reason: transaction.reason
      }))
    };
  }
};
