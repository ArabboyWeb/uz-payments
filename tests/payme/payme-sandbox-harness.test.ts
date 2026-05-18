import { describe, expect, it } from "vitest";
import {
  PaymeCallbacks,
  PaymeJsonRpcResponse,
  PaymeMerchantError,
  PaymeProvider,
  PaymeTransactionState
} from "@uz-payments/payme";

const PAYME_TIME = 1_399_114_284_039;
const SECRET = "sandbox-secret";

type PaymeSandboxPayload = {
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

interface SandboxLogEntry {
  label: string;
  request: {
    headers: Record<string, string>;
    body: PaymeSandboxPayload;
  };
  response: PaymeJsonRpcResponse;
}

interface SandboxOrder {
  id: string;
  amount: number;
  paid: boolean;
}

interface SandboxTransaction {
  id: string;
  time: number;
  amount: number;
  account: Record<string, string>;
  create_time: number;
  perform_time: number;
  cancel_time: number;
  transaction: string;
  state: PaymeTransactionState;
  reason: number | null;
}

function authHeaders(secret = SECRET): Record<string, string> {
  return {
    authorization: `Basic ${Buffer.from(`Paycom:${secret}`).toString("base64")}`
  };
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  return {
    ...headers,
    authorization: headers.authorization ? "[REDACTED]" : ""
  };
}

function expectPaymeResponseShape(response: PaymeJsonRpcResponse, id: number | null): void {
  expect(response).not.toHaveProperty("jsonrpc");
  expect(response.id).toBe(id);

  if ("error" in response) {
    expect(response.error).toEqual(
      expect.objectContaining({
        code: expect.any(Number),
        message: {
          ru: expect.any(String),
          uz: expect.any(String),
          en: expect.any(String)
        }
      })
    );
    expect(response).not.toHaveProperty("result");
    return;
  }

  expect(response).toHaveProperty("result");
  expect(response).not.toHaveProperty("error");
}

function createSandboxMerchant() {
  const orders = new Map<string, SandboxOrder>([
    ["order_success", { id: "order_success", amount: 125_000, paid: false }],
    ["order_duplicate_create", { id: "order_duplicate_create", amount: 125_000, paid: false }],
    ["order_duplicate_perform", { id: "order_duplicate_perform", amount: 125_000, paid: false }],
    ["order_duplicate_cancel", { id: "order_duplicate_cancel", amount: 125_000, paid: false }]
  ]);
  const transactions = new Map<string, SandboxTransaction>();
  let clock = PAYME_TIME + 100;

  function getOrderId(account: Record<string, unknown>): string {
    return String(account.order_id ?? "");
  }

  const callbacks: PaymeCallbacks = {
    async checkPerformTransaction(ctx) {
      const order = orders.get(getOrderId(ctx.account));

      if (!order) {
        return { ok: false, reason: "ORDER_NOT_FOUND", data: "order_id" };
      }

      if (order.amount !== ctx.amount) {
        return { ok: false, reason: "INVALID_AMOUNT" };
      }

      return { ok: true };
    },

    async createTransaction(ctx) {
      const orderId = getOrderId(ctx.account);
      const order = orders.get(orderId);

      if (!order) {
        throw new PaymeMerchantError("ORDER_NOT_FOUND", "order_id");
      }

      if (order.amount !== ctx.amount) {
        throw new PaymeMerchantError("INVALID_AMOUNT");
      }

      const existing = transactions.get(ctx.transactionId);
      if (existing) {
        return {
          create_time: existing.create_time,
          transaction: existing.transaction,
          state: existing.state
        };
      }

      const transaction: SandboxTransaction = {
        id: ctx.transactionId,
        time: ctx.providerTime,
        amount: ctx.amount,
        account: { order_id: orderId },
        create_time: clock++,
        perform_time: 0,
        cancel_time: 0,
        transaction: ctx.transactionId,
        state: 1,
        reason: null
      };

      transactions.set(ctx.transactionId, transaction);
      return {
        create_time: transaction.create_time,
        transaction: transaction.transaction,
        state: transaction.state
      };
    },

    async performTransaction(ctx) {
      const transaction = transactions.get(ctx.transactionId);

      if (!transaction) {
        throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
      }

      if (transaction.state === 2) {
        return {
          perform_time: transaction.perform_time,
          transaction: transaction.transaction,
          state: transaction.state
        };
      }

      if (transaction.state < 0) {
        throw new PaymeMerchantError("TRANSACTION_CANCELLED");
      }

      transaction.perform_time = clock++;
      transaction.state = 2;

      const order = orders.get(transaction.account.order_id);
      if (order) {
        order.paid = true;
      }

      return {
        perform_time: transaction.perform_time,
        transaction: transaction.transaction,
        state: transaction.state
      };
    },

    async cancelTransaction(ctx) {
      const transaction = transactions.get(ctx.transactionId);

      if (!transaction) {
        throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
      }

      if (transaction.state < 0) {
        return {
          cancel_time: transaction.cancel_time,
          transaction: transaction.transaction,
          state: transaction.state
        };
      }

      transaction.cancel_time = clock++;
      transaction.reason = ctx.reason ?? 10;
      transaction.state = transaction.state === 2 ? -2 : -1;

      return {
        cancel_time: transaction.cancel_time,
        transaction: transaction.transaction,
        state: transaction.state
      };
    },

    async checkTransaction(ctx) {
      const transaction = transactions.get(ctx.transactionId);

      if (!transaction) {
        throw new PaymeMerchantError("TRANSACTION_NOT_FOUND");
      }

      return {
        create_time: transaction.create_time,
        perform_time: transaction.perform_time,
        cancel_time: transaction.cancel_time,
        transaction: transaction.transaction,
        state: transaction.state,
        ...(transaction.reason !== null ? { reason: transaction.reason } : {})
      };
    },

    async getStatement(ctx) {
      return {
        transactions: [...transactions.values()]
          .filter((transaction) => transaction.time >= ctx.from && transaction.time <= ctx.to)
          .sort((left, right) => left.time - right.time)
          .map((transaction) => ({
            id: transaction.id,
            time: transaction.time,
            amount: transaction.amount,
            account: transaction.account,
            create_time: transaction.create_time,
            perform_time: transaction.perform_time,
            cancel_time: transaction.cancel_time,
            transaction: transaction.transaction,
            state: transaction.state,
            ...(transaction.reason !== null ? { reason: transaction.reason } : {})
          }))
      };
    }
  };

  return { callbacks, transactions };
}

describe("Payme sandbox validation harness", () => {
  it("simulates full merchant flow and captures sanitized request/response logs", async () => {
    const provider = new PaymeProvider({
      merchantId: "sandbox-merchant",
      secretKey: SECRET,
      transactionTimeoutMs: 0
    });
    const sandbox = createSandboxMerchant();
    const logs: SandboxLogEntry[] = [];

    async function call(label: string, body: PaymeSandboxPayload): Promise<PaymeJsonRpcResponse> {
      const headers = authHeaders();
      const response = await provider.handleRequest(body, headers, sandbox.callbacks);
      logs.push({
        label,
        request: { headers: sanitizeHeaders(headers), body },
        response
      });
      expectPaymeResponseShape(response, body.id);
      return response;
    }

    const check = await call("check", {
      id: 1,
      method: "CheckPerformTransaction",
      params: { amount: 125_000, account: { order_id: "order_success" } }
    });
    expect(check).toMatchObject({ result: { allow: true } });

    const create = await call("create", {
      id: 2,
      method: "CreateTransaction",
      params: {
        id: "sandbox_tx_success",
        time: PAYME_TIME,
        amount: 125_000,
        account: { order_id: "order_success" }
      }
    });
    expect(create).toMatchObject({
      result: { transaction: "sandbox_tx_success", state: 1 }
    });

    const perform = await call("perform", {
      id: 3,
      method: "PerformTransaction",
      params: { id: "sandbox_tx_success" }
    });
    expect(perform).toMatchObject({
      result: { transaction: "sandbox_tx_success", state: 2 }
    });

    const cancel = await call("cancel-after-perform", {
      id: 4,
      method: "CancelTransaction",
      params: { id: "sandbox_tx_success", reason: 5 }
    });
    expect(cancel).toMatchObject({
      result: { transaction: "sandbox_tx_success", state: -2 }
    });

    const checkTransaction = await call("check-transaction", {
      id: 5,
      method: "CheckTransaction",
      params: { id: "sandbox_tx_success" }
    });
    expect(checkTransaction).toMatchObject({
      result: {
        transaction: "sandbox_tx_success",
        state: -2,
        reason: 5
      }
    });

    const statement = await call("statement", {
      id: 6,
      method: "GetStatement",
      params: { from: PAYME_TIME, to: PAYME_TIME }
    });
    expect(statement).toMatchObject({
      result: {
        transactions: [
          expect.objectContaining({
            id: "sandbox_tx_success",
            amount: 125_000,
            state: -2,
            reason: 5
          })
        ]
      }
    });

    expect(logs).toHaveLength(6);
    expect(logs.every((entry) => entry.request.headers.authorization === "[REDACTED]")).toBe(true);
  });

  it("validates duplicate CreateTransaction, PerformTransaction, and CancelTransaction responses", async () => {
    const provider = new PaymeProvider({
      merchantId: "sandbox-merchant",
      secretKey: SECRET,
      transactionTimeoutMs: 0
    });
    const sandbox = createSandboxMerchant();

    async function call(body: PaymeSandboxPayload): Promise<PaymeJsonRpcResponse> {
      const response = await provider.handleRequest(body, authHeaders(), sandbox.callbacks);
      expectPaymeResponseShape(response, body.id);
      return response;
    }

    const duplicateCreatePayload = {
      id: 10,
      method: "CreateTransaction",
      params: {
        id: "sandbox_tx_duplicate_create",
        time: PAYME_TIME,
        amount: 125_000,
        account: { order_id: "order_duplicate_create" }
      }
    };
    const createFirst = await call(duplicateCreatePayload);
    const createSecond = await call(duplicateCreatePayload);
    expect(createSecond).toEqual(createFirst);

    await call({
      id: 11,
      method: "CreateTransaction",
      params: {
        id: "sandbox_tx_duplicate_perform",
        time: PAYME_TIME,
        amount: 125_000,
        account: { order_id: "order_duplicate_perform" }
      }
    });
    const performPayload = {
      id: 12,
      method: "PerformTransaction",
      params: { id: "sandbox_tx_duplicate_perform" }
    };
    const performFirst = await call(performPayload);
    const performSecond = await call(performPayload);
    expect(performSecond).toEqual(performFirst);

    await call({
      id: 13,
      method: "CreateTransaction",
      params: {
        id: "sandbox_tx_duplicate_cancel",
        time: PAYME_TIME,
        amount: 125_000,
        account: { order_id: "order_duplicate_cancel" }
      }
    });
    const cancelPayload = {
      id: 14,
      method: "CancelTransaction",
      params: { id: "sandbox_tx_duplicate_cancel", reason: 4 }
    };
    const cancelFirst = await call(cancelPayload);
    const cancelSecond = await call(cancelPayload);
    expect(cancelSecond).toEqual(cancelFirst);
  });

  it("validates amount and auth failures against Payme expected error shape", async () => {
    const provider = new PaymeProvider({
      merchantId: "sandbox-merchant",
      secretKey: SECRET,
      transactionTimeoutMs: 0
    });
    const sandbox = createSandboxMerchant();

    const floatAmount = await provider.handleRequest(
      {
        id: 20,
        method: "CheckPerformTransaction",
        params: { amount: 12.5, account: { order_id: "order_success" } }
      },
      authHeaders(),
      sandbox.callbacks
    );
    expectPaymeResponseShape(floatAmount, 20);
    expect(floatAmount).toMatchObject({ error: { code: -32600 } });

    const negativeAmount = await provider.handleRequest(
      {
        id: 21,
        method: "CheckPerformTransaction",
        params: { amount: -100, account: { order_id: "order_success" } }
      },
      authHeaders(),
      sandbox.callbacks
    );
    expectPaymeResponseShape(negativeAmount, 21);
    expect(negativeAmount).toMatchObject({ error: { code: -32600 } });

    const invalidCredentials = await provider.handleRequest(
      {
        id: 22,
        method: "CheckPerformTransaction",
        params: { amount: 125_000, account: { order_id: "order_success" } }
      },
      authHeaders("wrong-secret"),
      sandbox.callbacks
    );
    expectPaymeResponseShape(invalidCredentials, 22);
    expect(invalidCredentials).toMatchObject({ error: { code: -32504 } });
  });
});
