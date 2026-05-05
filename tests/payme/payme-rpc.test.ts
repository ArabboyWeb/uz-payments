import { describe, expect, it } from "vitest";
import { ProviderMethodNotSupportedError } from "@uz-payments/core";
import { assertSupportedPaymeMethod, parsePaymeRequest } from "@uz-payments/payme";

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
});
