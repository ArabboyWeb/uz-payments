import { describe, expect, it } from "vitest";
import { redactAuditPayload } from "@uz-payments/core";

describe("redactAuditPayload", () => {
  it("redacts top-level secret keys", () => {
    const result = redactAuditPayload({
      merchantId: "m123",
      secretKey: "sk_live_abc",
      amount: 5000
    });

    expect(result).toEqual({
      merchantId: "m123",
      secretKey: "[REDACTED]",
      amount: 5000
    });
  });

  it("redacts nested secret keys recursively", () => {
    const result = redactAuditPayload({
      provider: "payme",
      config: {
        merchantId: "m123",
        secretKey: "sk_live_abc",
        nested: {
          authorization: "Bearer xyz"
        }
      }
    });

    expect(result).toEqual({
      provider: "payme",
      config: {
        merchantId: "m123",
        secretKey: "[REDACTED]",
        nested: {
          authorization: "[REDACTED]"
        }
      }
    });
  });

  it("redacts secret keys inside arrays of objects", () => {
    const result = redactAuditPayload({
      items: [
        { id: 1, token: "abc" },
        { id: 2, password: "xyz" }
      ]
    });

    expect(result).toEqual({
      items: [
        { id: 1, token: "[REDACTED]" },
        { id: 2, password: "[REDACTED]" }
      ]
    });
  });

  it("preserves non-secret values in arrays", () => {
    const result = redactAuditPayload({
      tags: ["payment", "refund"],
      amounts: [100, 200]
    });

    expect(result).toEqual({
      tags: ["payment", "refund"],
      amounts: [100, 200]
    });
  });

  it("handles empty objects", () => {
    expect(redactAuditPayload({})).toEqual({});
  });

  it("redacts all known secret hint keys", () => {
    const result = redactAuditPayload({
      secret: "a",
      token: "b",
      password: "c",
      authorization: "d",
      auth: "e",
      key: "f",
      safeField: "keep"
    });

    expect(result.secret).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
    expect(result.authorization).toBe("[REDACTED]");
    expect(result.auth).toBe("[REDACTED]");
    expect(result.key).toBe("[REDACTED]");
    expect(result.safeField).toBe("keep");
  });
});
