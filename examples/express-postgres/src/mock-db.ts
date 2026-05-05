import type { PaymentState } from "@uz-payments/core";

export interface Order {
  id: string;
  amountTiyin: number;
  paid: boolean;
}

export interface PaymentTransaction {
  provider: "payme";
  providerTransactionId: string;
  orderId: string;
  amountTiyin: number;
  state: PaymentState;
  createTime: number;
  performTime?: number;
  cancelTime?: number;
  rawPayload: Record<string, unknown>;
}

const orders = new Map<string, Order>([
  ["order_100", { id: "order_100", amountTiyin: 125000, paid: false }]
]);

const transactions = new Map<string, PaymentTransaction>();

export const db = {
  orders: {
    async findById(id: string): Promise<Order | null> {
      return orders.get(id) ?? null;
    },
    async markPaid(id: string): Promise<void> {
      const order = orders.get(id);
      if (order) {
        order.paid = true;
      }
    }
  },
  transactions: {
    async findByProviderId(providerTransactionId: string): Promise<PaymentTransaction | null> {
      return transactions.get(providerTransactionId) ?? null;
    },
    async create(input: PaymentTransaction): Promise<PaymentTransaction> {
      const existing = transactions.get(input.providerTransactionId);
      if (existing) {
        return existing;
      }

      transactions.set(input.providerTransactionId, input);
      return input;
    },
    async markConfirmed(providerTransactionId: string, performTime: number): Promise<void> {
      const transaction = transactions.get(providerTransactionId);
      if (transaction) {
        transaction.state = "CONFIRMED";
        transaction.performTime = transaction.performTime ?? performTime;
      }
    },
    async cancel(providerTransactionId: string, cancelTime: number): Promise<void> {
      const transaction = transactions.get(providerTransactionId);
      if (transaction) {
        transaction.state = "CANCELLED";
        transaction.cancelTime = transaction.cancelTime ?? cancelTime;
      }
    },
    async statement(from: number, to: number): Promise<PaymentTransaction[]> {
      return [...transactions.values()].filter((transaction) => {
        return transaction.createTime >= from && transaction.createTime <= to;
      });
    }
  }
};
