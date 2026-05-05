import type { PaymentState } from "@uz-payments/core";

interface Order {
  id: string;
  amountTiyin: number;
  paid: boolean;
}

interface Transaction {
  id: string;
  orderId: string;
  amountTiyin: number;
  state: PaymentState;
  createTime: number;
  performTime?: number;
  cancelTime?: number;
}

const orders = new Map<string, Order>([
  ["order_200", { id: "order_200", amountTiyin: 990000, paid: false }]
]);

const transactions = new Map<string, Transaction>();

export const db = {
  async findOrder(id: string): Promise<Order | null> {
    return orders.get(id) ?? null;
  },
  async markOrderPaid(id: string): Promise<void> {
    const order = orders.get(id);
    if (order) {
      order.paid = true;
    }
  },
  async upsertTransaction(input: Transaction): Promise<Transaction> {
    const existing = transactions.get(input.id);
    if (existing) {
      return existing;
    }

    transactions.set(input.id, input);
    return input;
  },
  async findTransaction(id: string): Promise<Transaction | null> {
    return transactions.get(id) ?? null;
  },
  async setTransactionState(
    id: string,
    state: PaymentState,
    timestampField: "performTime" | "cancelTime",
    timestamp: number
  ): Promise<Transaction | null> {
    const transaction = transactions.get(id);
    if (!transaction) {
      return null;
    }

    transaction.state = state;
    transaction[timestampField] = transaction[timestampField] ?? timestamp;
    return transaction;
  },
  async statement(from: number, to: number): Promise<Transaction[]> {
    return [...transactions.values()].filter((transaction) => {
      return transaction.createTime >= from && transaction.createTime <= to;
    });
  }
};
