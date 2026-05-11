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

export interface PaymentAuditEvent {
  provider: "payme";
  event: string;
  providerTransactionId?: string;
  orderId?: string;
  safePayload: Record<string, unknown>;
  createdAt: Date;
}

const orders = new Map<string, Order>([
  ["order_100", { id: "order_100", amountTiyin: 125000, paid: false }]
]);

const transactions = new Map<string, PaymentTransaction>();
const auditEvents: PaymentAuditEvent[] = [];

export const db = {
  async withPaymentTransaction<T>(fn: () => Promise<T>): Promise<T> {
    // Production code must use a real DB transaction here.
    console.log("BEGIN");
    try {
      const result = await fn();
      console.log("COMMIT");
      return result;
    } catch (error) {
      console.log("ROLLBACK");
      throw error;
    }
  },
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
        await db.audit.record({
          provider: "payme",
          event: "payme.create.duplicate",
          providerTransactionId: existing.providerTransactionId,
          orderId: existing.orderId,
          safePayload: { state: existing.state }
        });
        return existing;
      }

      transactions.set(input.providerTransactionId, input);
      await db.audit.record({
        provider: "payme",
        event: "payme.create.stored",
        providerTransactionId: input.providerTransactionId,
        orderId: input.orderId,
        safePayload: { amountTiyin: input.amountTiyin, state: input.state }
      });
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
  },
  audit: {
    async record(input: Omit<PaymentAuditEvent, "createdAt">): Promise<void> {
      auditEvents.push({ ...input, createdAt: new Date() });
    },
    async list(): Promise<PaymentAuditEvent[]> {
      return auditEvents;
    }
  }
};
