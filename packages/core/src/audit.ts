export interface PaymentAuditEvent {
  provider: string;
  event: string;
  transactionId?: string;
  orderId?: string;
  safePayload?: Record<string, unknown>;
  createdAt: Date;
}

const SECRET_KEY_HINTS = ["secret", "token", "password", "authorization", "auth", "key"];

export function redactAuditPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    const lower = key.toLowerCase();
    safe[key] = SECRET_KEY_HINTS.some((hint) => lower.includes(hint)) ? "[REDACTED]" : value;
  }

  return safe;
}
