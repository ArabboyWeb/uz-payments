import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymeCallbacks, PaymeProvider } from "@uz-payments/payme";

function authHeaders(secret = "secret"): Record<string, string> {
  return {
    authorization: `Basic ${Buffer.from(`Paycom:${secret}`).toString("base64")}`
  };
}

function createCallbacks(): PaymeCallbacks {
  return {
    checkPerformTransaction: vi.fn(async () => ({ ok: true })),
    createTransaction: vi.fn(async () => ({ create_time: 1000 })),
    performTransaction: vi.fn(async () => ({ perform_time: 2000 })),
    cancelTransaction: vi.fn(async () => ({ cancel_time: 3000 })),
    checkTransaction: vi.fn(async () => ({ create_time: 1000, perform_time: 2000, state: 2 })),
    getStatement: vi.fn(async () => ({ transactions: [] }))
  };
}

describe("PaymeProvider", () => {
  let provider: PaymeProvider;
  let callbacks: PaymeCallbacks;

  beforeEach(() => {
    provider = new PaymeProvider({ merchantId: "merchant", secretKey: "secret" });
    callbacks = createCallbacks();
  });

  it("returns safe response for an invalid JSON-RPC method", async () => {
    const response = await provider.handleRequest(
      { jsonrpc: "2.0", id: 1, method: "Unknown", params: {} },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32601);
  });

  it("returns safe response for missing params", async () => {
    const response = await provider.handleRequest(
      { jsonrpc: "2.0", id: 1, method: "CheckPerformTransaction" },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32600);
  });

  it("returns safe response for unauthorized request", async () => {
    const response = await provider.handleRequest(
      { jsonrpc: "2.0", id: 1, method: "CheckPerformTransaction", params: {} },
      authHeaders("wrong"),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-32504);
  });

  it("handles CheckPerformTransaction callback success", async () => {
    const response = await provider.handleRequest(
      {
        jsonrpc: "2.0",
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
      reason: "ORDER_NOT_FOUND"
    }));

    const response = await provider.handleRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 5000, account: { order_id: "missing" } }
      },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31050);
  });

  it("maps CheckPerformTransaction invalid amount failure", async () => {
    callbacks.checkPerformTransaction = vi.fn(async () => ({
      ok: false,
      reason: "INVALID_AMOUNT"
    }));

    const response = await provider.handleRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount: 5000, account: { order_id: "order_1" } }
      },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.code).toBe(-31001);
  });

  it("handles CreateTransaction flow", async () => {
    const response = await provider.handleRequest(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "CreateTransaction",
        params: { id: "tx_1", time: 10, amount: 5000, account: { order_id: "order_1" } }
      },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { create_time: 1000, transaction: "tx_1", state: 1 }
    });
    expect(callbacks.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: "tx_1", amount: 5000 })
    );
  });

  it("handles PerformTransaction flow", async () => {
    const response = await provider.handleRequest(
      { jsonrpc: "2.0", id: 3, method: "PerformTransaction", params: { id: "tx_1" } },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { perform_time: 2000, transaction: "tx_1", state: 2 }
    });
  });

  it("handles CancelTransaction flow", async () => {
    const response = await provider.handleRequest(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "CancelTransaction",
        params: { id: "tx_1", reason: 1 }
      },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { cancel_time: 3000, transaction: "tx_1", state: -1 }
    });
  });

  it("handles CheckTransaction flow", async () => {
    const response = await provider.handleRequest(
      { jsonrpc: "2.0", id: 5, method: "CheckTransaction", params: { id: "tx_1" } },
      authHeaders(),
      callbacks
    );

    expect(response).toMatchObject({
      result: { create_time: 1000, perform_time: 2000, transaction: "tx_1", state: 2 }
    });
  });

  it("returns safe JSON-RPC response when callbacks throw", async () => {
    callbacks.performTransaction = vi.fn(async () => {
      throw new Error("database secret details");
    });

    const response = await provider.handleRequest(
      { jsonrpc: "2.0", id: 6, method: "PerformTransaction", params: { id: "tx_1" } },
      authHeaders(),
      callbacks
    );

    expect("error" in response && response.error.message.en).toBe("Cannot perform operation");
    expect(JSON.stringify(response)).not.toContain("database secret details");
  });
});
