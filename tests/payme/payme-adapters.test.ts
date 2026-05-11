import { describe, expect, it, vi } from "vitest";
import { createPaymeExpressHandler } from "@uz-payments/express";
import { createPaymeNextHandler } from "@uz-payments/next";
import { PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";

function createProvider() {
  return new PaymeProvider({ merchantId: "merchant", secretKey: "secret" });
}

function createCallbacks(): PaymeCallbacks {
  return {
    checkPerformTransaction: vi.fn(async () => ({ ok: true })),
    createTransaction: vi.fn(async () => ({ create_time: Date.now() })),
    performTransaction: vi.fn(async () => ({ perform_time: Date.now() })),
    cancelTransaction: vi.fn(async () => ({ cancel_time: Date.now() })),
    checkTransaction: vi.fn(async () => ({ create_time: Date.now(), state: 1 })),
    getStatement: vi.fn(async () => ({ transactions: [] }))
  };
}

describe("Payme adapters", () => {
  it("Express adapter maps invalid JSON body to Payme -32700 parse error", async () => {
    const provider = createProvider();
    const callbacks = createCallbacks();
    const handler = createPaymeExpressHandler(provider, callbacks);

    const chunks = [Buffer.from("{not-json", "utf8")];
    const req = {
      body: undefined,
      headers: { authorization: "Basic invalid" },
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }
    } as any;

    const json = vi.fn();
    const res = {
      status: vi.fn(() => res),
      json
    } as any;

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: -32700 }) })
    );
  });

  it("Next adapter maps request.json SyntaxError to Payme -32700 parse error", async () => {
    const provider = createProvider();
    const callbacks = createCallbacks();
    const handler = createPaymeNextHandler(provider, callbacks);

    const request = {
      headers: new Headers({ authorization: "Basic invalid" }),
      json: async () => {
        throw new SyntaxError("invalid json");
      }
    };

    const response = await handler(request);
    const body = await response.json();

    expect(body).toMatchObject({ error: { code: -32700 } });
  });
});
