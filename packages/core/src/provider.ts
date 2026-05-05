export interface PaymentProvider {
  readonly name: string;
}

export interface PaymentTransactionContext {
  provider: string;
  providerTransactionId: string;
  orderId: string;
  amountTiyin: number;
}

export interface ProviderRequestContext {
  headers: Record<string, string | string[] | undefined>;
  rawBody?: string;
  receivedAt: Date;
}
