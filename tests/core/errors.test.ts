import { describe, expect, it } from "vitest";
import {
  IdempotencyConflictError,
  InvalidAmountError,
  InvalidProviderPayloadError,
  InvalidStateTransitionError,
  ProviderConfigurationError,
  ProviderMethodNotSupportedError,
  UnauthorizedWebhookError,
  UzPaymentsError
} from "@uz-payments/core";

describe("typed errors", () => {
  it("exposes stable error codes", () => {
    const errors = [
      new InvalidAmountError(),
      new InvalidProviderPayloadError(),
      new UnauthorizedWebhookError(),
      new InvalidStateTransitionError(),
      new ProviderMethodNotSupportedError(),
      new IdempotencyConflictError(),
      new ProviderConfigurationError()
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(UzPaymentsError);
      expect(error.code).toMatch(/^[A-Z_]+$/);
    }
  });
});
