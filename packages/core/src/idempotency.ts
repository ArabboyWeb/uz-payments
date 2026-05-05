/**
 * Payment provider callbacks are commonly retried. Applications must treat
 * create, perform, cancel, and refund operations as idempotent.
 *
 * This SDK exposes a minimal contract only. Production systems should persist
 * idempotency keys and results in a durable database transaction, not memory.
 */
export interface IdempotencyStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown): Promise<void>;
}

export interface IdempotencyRecord<TValue = unknown> {
  key: string;
  value: TValue;
  createdAt: Date;
}

export function createProviderIdempotencyKey(
  provider: string,
  providerTransactionId: string,
  operation: string
): string {
  return `${provider}:${providerTransactionId}:${operation}`;
}
