export type PaymeMethod =
  | "CheckPerformTransaction"
  | "CreateTransaction"
  | "PerformTransaction"
  | "CancelTransaction"
  | "CheckTransaction"
  | "GetStatement";

export type PaymeJsonRpcId = string | number | null;

export interface PaymeJsonRpcRequest {
  jsonrpc?: "2.0";
  id?: PaymeJsonRpcId;
  method: PaymeMethod | string;
  params?: unknown;
}

export interface PaymeJsonRpcError {
  code: number;
  message: {
    ru: string;
    uz: string;
    en: string;
  };
  data?: string;
}

export type PaymeJsonRpcResponse =
  | {
      id: PaymeJsonRpcId;
      result: Record<string, unknown>;
    }
  | {
      id: PaymeJsonRpcId;
      error: PaymeJsonRpcError;
    };

export type PaymeAccount = Record<string, string | number | boolean | null | undefined>;

export type PaymeTransactionState = 1 | 2 | -1 | -2;

export interface PaymeReceiver {
  id: string;
  amount: number;
}

export interface PaymeBaseCallbackContext {
  rawPayload: PaymeJsonRpcRequest;
}

export interface PaymeAmountAccountContext extends PaymeBaseCallbackContext {
  amount: number;
  account: PaymeAccount;
}

export interface PaymeTransactionContext extends PaymeAmountAccountContext {
  transactionId: string;
  providerTime: number;
}

export interface PaymeIdContext extends PaymeBaseCallbackContext {
  transactionId: string;
}

export interface PaymeCancelContext extends PaymeIdContext {
  reason?: number;
}

export interface PaymeStatementContext extends PaymeBaseCallbackContext {
  from: number;
  to: number;
}

export type PaymeCheckFailureReason = "ORDER_NOT_FOUND" | "INVALID_AMOUNT" | "CANNOT_PERFORM";

export type PaymeCheckPerformResult =
  | { ok: true }
  | { ok: false; reason: PaymeCheckFailureReason; data?: string };

export interface PaymeCreateTransactionResult {
  create_time: number;
  transaction?: string;
  state?: PaymeTransactionState;
  receivers?: PaymeReceiver[] | null;
}

export interface PaymePerformTransactionResult {
  perform_time: number;
  transaction?: string;
  state?: PaymeTransactionState;
}

export interface PaymeCancelTransactionResult {
  cancel_time: number;
  transaction?: string;
  state?: PaymeTransactionState;
}

export interface PaymeCheckTransactionResult {
  create_time: number;
  perform_time?: number;
  cancel_time?: number;
  transaction?: string;
  state: PaymeTransactionState;
  reason?: number;
}

export interface PaymeStatementTransaction {
  id: string;
  time: number;
  amount: number;
  account: PaymeAccount;
  create_time: number;
  perform_time?: number;
  cancel_time?: number;
  transaction?: string;
  state: PaymeTransactionState;
  reason?: number;
  receivers?: PaymeReceiver[] | null;
}

export interface PaymeGetStatementResult {
  transactions: PaymeStatementTransaction[];
}

/**
 * Default transaction timeout: 12 hours in milliseconds.
 * Payme documentation specifies that merchants should reject CreateTransaction
 * requests where the provider-issued timestamp is older than this threshold.
 */
export const PAYME_DEFAULT_TRANSACTION_TIMEOUT_MS = 43_200_000;

export interface PaymeProviderOptions {
  merchantId: string;
  secretKey: string;
  basicAuthUsername?: string;

  /**
   * Maximum age of a CreateTransaction provider timestamp before the SDK
   * automatically rejects it with CANNOT_PERFORM. Defaults to 12 hours
   * (43,200,000 ms) per Payme documentation.
   *
   * Set to `0` to disable the SDK-level timeout check entirely and handle
   * it in your own callbacks.
   */
  transactionTimeoutMs?: number;
}
