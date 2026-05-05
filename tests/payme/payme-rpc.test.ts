import { describe, expect, it } from "vitest";
import { ProviderMethodNotSupportedError } from "@uz-payments/core";
import {
  assertSupportedPaymeMethod,
  parseErrorResponse,
  parsePaymeRequest,
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
});
