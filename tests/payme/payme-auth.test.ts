import { describe, expect, it } from "vitest";
import { UnauthorizedWebhookError } from "@uz-payments/core";
import { assertPaymeBasicAuth } from "@uz-payments/payme";

const options = {
  merchantId: "merchant",
  secretKey: "secret"
};

function basic(value: string): string {
  return `Basic ${Buffer.from(value).toString("base64")}`;
}

describe("Payme auth", () => {
  it("accepts valid Basic auth", () => {
    expect(() =>
      assertPaymeBasicAuth({ authorization: basic("Paycom:secret") }, options)
    ).not.toThrow();
  });

  it("accepts the configured Payme Basic auth login", () => {
    expect(() =>
      assertPaymeBasicAuth(
        { authorization: basic("merchant-login:secret") },
        { ...options, basicAuthUsername: "merchant-login" }
      )
    ).not.toThrow();
  });

  it("rejects unauthorized requests", () => {
    expect(() => assertPaymeBasicAuth({}, options)).toThrow(UnauthorizedWebhookError);
    expect(() => assertPaymeBasicAuth({ authorization: basic("Paycom:wrong") }, options)).toThrow(
      UnauthorizedWebhookError
    );
  });
});
