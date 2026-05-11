import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymeCallbacks, PaymeMerchantError, PaymeProvider } from "@uz-payments/payme";

const PAYME_TIME = 1_399_114_284_039;

function authHeaders(secret = "secret", username = "Paycom"): Record<string, string> {
  return {
    authorization: `Basic ${Buffer.from(`${username}:${secret}`).toString("base64")}`
  };
}

function createCallbacks(): PaymeCallbacks {
  return {
    checkPerformTransaction: vi.fn(async () => ({ ok: true })),
    createTransaction: vi.fn(async () => ({ create_time: PAYME_TIME })),
    performTransaction: vi.fn(async () => ({ perform_time: PAYME_TIME + 1000 })),
    cancelTransaction: vi.fn(async () => ({ cancel_time: PAYME_TIME + 2000 })),
    checkTransaction: vi.fn(async () => ({
      create_time: PAYME_TIME,
      perform_time: PAYME_TIME + 1000,
      state: 2
    })),
    getStatement: vi.fn(async () => ({ transactions: [] }))
  };
}

function createTransactionPayload(id = "tx_1") {
  return {
    id: 2,
    method: "CreateTransaction",
    params: {
      id,
      time: PAYME_TIME,
      amount: 5000,
      account: { order_id: "order_1" }
    }
  };
}

describe("PaymeProvider", () => {
  let provider: PaymeProvider;
  let callbacks: PaymeCallbacks;

  beforeEach(() => {
    provider = new PaymeProvider({ merchantId: "merchant", secretKey: "secret" });
    callbacks = createCallbacks();
  });

  it("returns the Payme documented RPC response shape without a jsonrpc member", async () => {
    const response = await provider.handleRequest(
      {
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 5000, account: { order_id: "order_1" } }
      },
      authHeaders(),
      callbacks
    );

    expect(response).toEqual({ id: 1, result: { allow: true } });
    expect(response).not.toHaveProperty("jsonrpc");
  });

  it("returns safe response for an invalid JSON-RPC method", async () => {
    const response = await provider.handleRequest(
      { id: 1, method: "Unknown", params: {} },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({ id: 1, error: { code: -32601, data: "Unknown" } });
  });

  it("returns safe response for missing params", async () => {
    const response = await provider.handleRequest(
      { id: 1, method: "CheckPerformTransaction" },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32600);
  });

  it("returns safe response for invalid auth", async () => {
    const response = await provider.handleRequest(
      { id: 1, method: "CheckPerformTransaction", params: {} },
      authHeaders("wrong"),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32504);
  });

  it("rejects invalid Payme amount params before callbacks are called", async () => {
    const response = await provider.handleRequest(
      {
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 0, account: { order_id: "order_1" } }
      },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32600);
    expect(callbacks.checkPerformTransaction).not.toHaveBeenCalled();
  });

  it("handles CheckPerformTransaction callback success", async () => {
    const response = await provider.handleRequest(
      {
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 5000, account: { order_id: "order_1" } }
      },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({ result: { allow: true } });
    expect(callbacks.checkPerformTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        account: { order_id: "order_1" }
      })
    );
  });

  it("maps CheckPerformTransaction order-not-found failure", async () => {
    callbacks.checkPerformTransaction = vi.fn(async () => ({
      ok: false,
      reason: "ORDER_NOT_FOUND",
      data: "order_id"
    }));

    const response = await provider.handleRequest(
      {
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 5000, account: { order_id: "missing" } }
      },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({ error: { code: -31050, data: "order_id" } });
  });

  it("maps CheckPerformTransaction invalid amount failure", async () => {
    callbacks.checkPerformTransaction = vi.fn(async () => ({
      ok: false,
      reason: "INVALID_AMOUNT"
    }));

    const response = await provider.handleRequest(
      {
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 5000, account: { order_id: "order_1" } }
      },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31001);
  });

  it("maps CreateTransaction order-not-found failure", async () => {
    callbacks.createTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("ORDER_NOT_FOUND", "order_id");
    });

    const response = await provider.handleRequest(
      createTransactionPayload("tx_missing_order"),
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31050);
    expect("error" in response && response.error.data).toBe("order_id");
  });

  it("maps CreateTransaction invalid amount failure", async () => {
    callbacks.createTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("INVALID_AMOUNT");
    });

    const response = await provider.handleRequest(
      createTransactionPayload("tx_invalid_amount"),
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31001);
  });

  it("handles CreateTransaction flow", async () => {
    const response = await provider.handleRequest(
      createTransactionPayload(),
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { create_time: PAYME_TIME, transaction: "tx_1", state: 1 }
    });
    expect(callbacks.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "tx_1", amount: 5000, providerTime: PAYME_TIME })
    );
  });

  it("handles repeated CreateTransaction requests idempotently when callbacks return the stored transaction", async () => {
    const transactions = new Map<string, { createTime: number }>();
    callbacks.createTransaction = vi.fn(async (ctx) => {
      const existing = transactions.get(ctx.transactionId);
      if (existing) {
        return { create_time: existing.createTime, transaction: ctx.transactionId, state: 1 };
      }

      const created = { createTime: PAYME_TIME + 10 };
      transactions.set(ctx.transactionId, created);
      return { create_time: created.createTime, transaction: ctx.transactionId, state: 1 };
    });

    const first = await provider.handleRequest(
      createTransactionPayload("tx_repeat"),
      authHeaders(),
      callbacks
    );
    const second = await provider.handleRequest(
      createTransactionPayload("tx_repeat"),
      authHeaders(),
      callbacks
    );

    expect(first).toEqual(second);
    expect(callbacks.createTransaction).toHaveBeenCalledTimes(2);
  });

  it("maps already performed transaction errors to Payme state errors", async () => {
    callbacks.createTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("TRANSACTION_ALREADY_DONE");
    });

    const response = await provider.handleRequest(
      createTransactionPayload("tx_done"),
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31008);
  });

  it("handles PerformTransaction flow", async () => {
    const response = await provider.handleRequest(
      { id: 3, method: "PerformTransaction", params: { id: "tx_1" } },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { perform_time: PAYME_TIME + 1000, transaction: "tx_1", state: 2 }
    });
  });

  it("handles repeated PerformTransaction requests idempotently when callbacks return the stored perform_time", async () => {
    const performed = new Map<string, number>();
    callbacks.performTransaction = vi.fn(async (ctx) => {
      const performTime = performed.get(ctx.transactionId) ?? PAYME_TIME + 3000;
      performed.set(ctx.transactionId, performTime);
      return { perform_time: performTime, transaction: ctx.transactionId, state: 2 };
    });

    const payload = { id: 3, method: "PerformTransaction", params: { id: "tx_repeat" } };
    const first = await provider.handleRequest(payload, authHeaders(), callbacks);
    const second = await provider.handleRequest(payload, authHeaders(), callbacks);

    expect(first).toEqual(second);
    expect(callbacks.performTransaction).toHaveBeenCalledTimes(2);
  });

  it("maps unknown transaction errors", async () => {
    callbacks.performTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    });

    const response = await provider.handleRequest(
      { id: 3, method: "PerformTransaction", params: { id: "missing" } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31003);
  });

  it("maps cancelled transaction errors to cannot-perform state errors", async () => {
    callbacks.performTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("TRANSACTION_CANCELLED");
    });

    const response = await provider.handleRequest(
      { id: 3, method: "PerformTransaction", params: { id: "cancelled" } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31008);
  });

  it("handles CancelTransaction flow", async () => {
    const response = await provider.handleRequest(
      {
        id: 4,
        method: "CancelTransaction",
        params: { id: "tx_1", reason: 1 }
      },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { cancel_time: PAYME_TIME + 2000, transaction: "tx_1", state: -1 }
    });
  });

  it("maps cancelled transaction errors to Payme -31008 for CancelTransaction", async () => {
    callbacks.cancelTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("TRANSACTION_CANCELLED");
    });

    const response = await provider.handleRequest(
      { id: 4, method: "CancelTransaction", params: { id: "cancelled", reason: 2 } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31008);
  });

  it("handles repeated CancelTransaction requests idempotently when callbacks return the stored cancel_time", async () => {
    const cancelled = new Map<string, number>();
    callbacks.cancelTransaction = vi.fn(async (ctx) => {
      const cancelTime = cancelled.get(ctx.transactionId) ?? PAYME_TIME + 4000;
      cancelled.set(ctx.transactionId, cancelTime);
      return { cancel_time: cancelTime, transaction: ctx.transactionId, state: -1 };
    });

    const payload = { id: 4, method: "CancelTransaction", params: { id: "tx_repeat", reason: 4 } };
    const first = await provider.handleRequest(payload, authHeaders(), callbacks);
    const second = await provider.handleRequest(payload, authHeaders(), callbacks);

    expect(first).toEqual(second);
    expect(callbacks.cancelTransaction).toHaveBeenCalledTimes(2);
  });

  it("maps cannot-cancel-after-delivery errors to Payme -31007", async () => {
    callbacks.cancelTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("CANNOT_CANCEL_AFTER_DELIVERY");
    });

    const response = await provider.handleRequest(
      { id: 4, method: "CancelTransaction", params: { id: "tx_1", reason: 5 } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31007);
  });

  it("maps unknown transaction errors for CheckTransaction", async () => {
    callbacks.checkTransaction = vi.fn(async () => {
      throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
    });

    const response = await provider.handleRequest(
      { id: 5, method: "CheckTransaction", params: { id: "missing" } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31003);
  });

  it("handles CheckTransaction flow with Payme-required zero/null fallback fields", async () => {
    callbacks.checkTransaction = vi.fn(async () => ({
      create_time: PAYME_TIME,
      state: 1
    }));

    const response = await provider.handleRequest(
      { id: 5, method: "CheckTransaction", params: { id: "tx_1" } },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: {
        create_time: PAYME_TIME,
        perform_time: 0,
        cancel_time: 0,
        transaction: "tx_1",
        state: 1,
        reason: null
      }
    });
  });

  it("handles repeated CheckTransaction requests idempotently when callbacks read stored state", async () => {
    callbacks.checkTransaction = vi.fn(async (ctx) => ({
      create_time: PAYME_TIME,
      perform_time: PAYME_TIME + 1000,
      cancel_time: 0,
      transaction: ctx.transactionId,
      state: 2
    }));

    const payload = { id: 5, method: "CheckTransaction", params: { id: "tx_repeat" } };
    const first = await provider.handleRequest(payload, authHeaders(), callbacks);
    const second = await provider.handleRequest(payload, authHeaders(), callbacks);

    expect(first).toEqual(second);
    expect(callbacks.checkTransaction).toHaveBeenCalledTimes(2);
  });

  it("returns safe system-error response when callbacks throw unexpected errors", async () => {
    callbacks.performTransaction = vi.fn(async () => {
      throw new Error("database secret details");
    });

    const response = await provider.handleRequest(
      { id: 6, method: "PerformTransaction", params: { id: "tx_1" } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32400);
    expect("error" in response && response.error.message.en).toBe("System error");
    expect(JSON.stringify(response)).not.toContain("database secret details");
  });
});
