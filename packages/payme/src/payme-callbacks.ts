import type {
  PaymeAmountAccountContext,
  PaymeCancelContext,
  PaymeCheckPerformResult,
  PaymeCheckTransactionResult,
  PaymeCancelTransactionResult,
  PaymeCreateTransactionResult,
  PaymeGetStatementResult,
  PaymeIdContext,
  PaymePerformTransactionResult,
  PaymeStatementContext,
  PaymeTransactionContext
} from "./payme-types";

export interface PaymeCallbacks {
  checkPerformTransaction(ctx: PaymeAmountAccountContext): Promise<PaymeCheckPerformResult>;
  createTransaction(ctx: PaymeTransactionContext): Promise<PaymeCreateTransactionResult>;
  performTransaction(ctx: PaymeIdContext): Promise<PaymePerformTransactionResult>;
  cancelTransaction(ctx: PaymeCancelContext): Promise<PaymeCancelTransactionResult>;
  checkTransaction(ctx: PaymeIdContext): Promise<PaymeCheckTransactionResult>;
  getStatement(ctx: PaymeStatementContext): Promise<PaymeGetStatementResult>;
}
