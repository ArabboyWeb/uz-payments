export interface UzPaymentsErrorOptions {
  code: string;
  message: string;
  cause?: unknown;
  details?: Record<string, unknown> | undefined;
}

export class UzPaymentsError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(options: UzPaymentsErrorOptions) {
    super(options.message);
    this.name = new.target.name;
    this.code = options.code;
    this.details = options.details;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class InvalidAmountError extends UzPaymentsError {
  constructor(message = "Invalid payment amount", details?: Record<string, unknown> | undefined) {
    super({ code: "INVALID_AMOUNT", message, details });
  }
}

export class InvalidProviderPayloadError extends UzPaymentsError {
  constructor(message = "Invalid provider payload", details?: Record<string, unknown> | undefined) {
    super({ code: "INVALID_PROVIDER_PAYLOAD", message, details });
  }
}

export class UnauthorizedWebhookError extends UzPaymentsError {
  constructor(message = "Unauthorized provider request", details?: Record<string, unknown> | undefined) {
    super({ code: "UNAUTHORIZED_WEBHOOK", message, details });
  }
}

export class InvalidStateTransitionError extends UzPaymentsError {
  constructor(message = "Invalid payment state transition", details?: Record<string, unknown> | undefined) {
    super({ code: "INVALID_STATE_TRANSITION", message, details });
  }
}

export class ProviderMethodNotSupportedError extends UzPaymentsError {
  constructor(message = "Provider method is not supported", details?: Record<string, unknown> | undefined) {
    super({ code: "PROVIDER_METHOD_NOT_SUPPORTED", message, details });
  }
}

export class IdempotencyConflictError extends UzPaymentsError {
  constructor(message = "Idempotency conflict", details?: Record<string, unknown> | undefined) {
    super({ code: "IDEMPOTENCY_CONFLICT", message, details });
  }
}

export class ProviderConfigurationError extends UzPaymentsError {
  constructor(message = "Invalid provider configuration", details?: Record<string, unknown> | undefined) {
    super({ code: "PROVIDER_CONFIGURATION_ERROR", message, details });
  }
}
