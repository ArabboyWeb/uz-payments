export interface PaymentAuditEvent {
  provider: string;
  event: string;
  transactionId?: string;
  orderId?: string;
  safePayload?: Record<string, unknown>;
  createdAt: Date;
}

const SECRET_KEY_HINTS = ["secret", "token", "password", "authorization", "auth", "key"];

/**
 * Recursively redact values whose keys match known secret-related hints.
 * Handles flat objects, nested objects, and arrays of objects.
 */
export function redactAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lower = key.toLowerCase();

    if (SECRET_KEY_HINTS.some((hint) => lower.includes(hint))) {
      safe[key] = "[REDACTED]";
      continue;
    }

    if (Array.isArray(value)) {
      safe[key] = value.map((item) =>
        typeof item === "object" && item !== null && !Array.isArray(item)
          ? redactAuditPayload(item as Record<string, unknown>)
          : item
      );
      continue;
    }

    if (typeof value === "object" && value !== null) {
      safe[key] = redactAuditPayload(value as Record<string, unknown>);
      continue;
    }

    safe[key] = value;
  }

  return safe;
}
