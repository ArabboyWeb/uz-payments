import { describe, expect, it, vi } from "vitest";
import { ProviderMethodNotSupportedError } from "@uz-payments/core";
import {
  assertSupportedPaymeMethod,
  invalidRequestResponse,
  methodNotFoundResponse,
  parseErrorResponse,
  parsePaymeRequest,
  safeHandlePaymeRpcRequest,
  successResponse
} from "@uz-payments/payme";

describe("Payme JSON-RPC helpers", () => {
  it("parses a valid request", () => {
    expect(
      parsePaymeRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "CheckPerformTransaction",
        params: {}
      })
    ).toMatchObject({ id: 1, method: "CheckPerformTransaction" });
  });

  it("rejects invalid JSON-RPC methods", () => {
    expect(() => assertSupportedPaymeMethod("Unknown")).toThrow(ProviderMethodNotSupportedError);
  });

  it("formats responses with the Payme documented result/id shape", () => {
    expect(successResponse(2032, { allow: true })).toEqual({
      id: 2032,
      result: { allow: true }
    });
  });

  it("formats Payme parse errors with -32700", () => {
    expect(parseErrorResponse(2032)).toMatchObject({
      id: 2032,
      error: { code: -32700 }
    });
  });

  it("returns safe -32600 for invalid JSON-RPC shapes (fuzz set)", async () => {
    const callbacks = {
      checkPerformTransaction: vi.fn(async () => ({ ok: true })),
      createTransaction: vi.fn(async () => ({ create_time: 1 })),
      performTransaction: vi.fn(async () => ({ perform_time: 1 })),
      cancelTransaction: vi.fn(async () => ({ cancel_time: 1 })),
      checkTransaction: vi.fn(async () => ({ create_time: 1, state: 1 })),
      getStatement: vi.fn(async () => ({ transactions: [] }))
    };

    const authenticate = () => {};
    const options = { merchantId: "m", secretKey: "s", transactionTimeoutMs: 0 };
    const cases: unknown[] = [
      null,
      123,
      "string",
      {},
      { id: 1 },
      { method: "CheckPerformTransaction" },
      { id: 1, method: 123, params: {} },
      { id: 1, method: "CheckPerformTransaction", params: null },
      { id: 1, method: "CreateTransaction", params: { id: "", time: 0, amount: -1, account: {} } }
    ];

    for (const payload of cases) {
      const response = await safeHandlePaymeRpcRequest(
        payload,
        callbacks as any,
        options,
        authenticate
      );
      expect("error" in response).toBe(true);
      expect("error" in response && typeof response.error.code).toBe("number");
      expect("error" in response && [-32600, -32601, -32400].includes(response.error.code)).toBe(
        true
      );
    }
  });

  it("returns method-not-found when an unsupported method is used", async () => {
    const callbacks = {
      checkPerformTransaction: vi.fn(async () => ({ ok: true })),
      createTransaction: vi.fn(async () => ({ create_time: 1 })),
      performTransaction: vi.fn(async () => ({ perform_time: 1 })),
      cancelTransaction: vi.fn(async () => ({ cancel_time: 1 })),
      checkTransaction: vi.fn(async () => ({ create_time: 1, state: 1 })),
      getStatement: vi.fn(async () => ({ transactions: [] }))
    };

    const response = await safeHandlePaymeRpcRequest(
      { id: 1, method: "Unknown", params: {} },
      callbacks as any,
      { merchantId: "m", secretKey: "s", transactionTimeoutMs: 0 },
      () => {}
    );

    expect(response).toEqual(methodNotFoundResponse(1, "Unknown"));
  });

  it("formats invalid request response with -32600", () => {
    expect(invalidRequestResponse(2032)).toMatchObject({
      id: 2032,
      error: { code: -32600 }
    });
  });
});
