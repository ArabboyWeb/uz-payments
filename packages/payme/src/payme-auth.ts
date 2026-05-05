import { timingSafeEqual } from "node:crypto";
import { ProviderConfigurationError, UnauthorizedWebhookError, getHeader } from "@uz-payments/core";

import type { PaymeProviderOptions } from "./payme-types";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validatePaymeConfig(options: PaymeProviderOptions): void {
  if (!options.merchantId) {
    throw new ProviderConfigurationError("Payme merchantId is required");
  }

  if (!options.secretKey) {
    throw new ProviderConfigurationError("Payme secretKey is required");
  }
}

export function assertPaymeBasicAuth(
  headers: Record<string, string | string[] | undefined>,
  options: PaymeProviderOptions
): void {
  const authorization = getHeader(headers, "authorization");

  if (!authorization?.startsWith("Basic ")) {
    throw new UnauthorizedWebhookError("Missing Payme Basic authorization header");
  }

  const encoded = authorization.slice("Basic ".length).trim();
  let decoded = "";

  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    throw new UnauthorizedWebhookError("Invalid Payme Basic authorization header");
  }

  const username = options.basicAuthUsername ?? "Paycom";
  const expected = `${username}:${options.secretKey}`;

  if (!safeEqual(decoded, expected)) {
    throw new UnauthorizedWebhookError("Invalid Payme Basic authorization credentials");
  }
}
