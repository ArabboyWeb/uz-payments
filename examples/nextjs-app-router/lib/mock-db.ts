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
  reason?: number;
  rawPayload?: Record<string, unknown>;
}

interface AuditEvent {
  event: string;
  providerTransactionId?: string;
  orderId?: string;
  safePayload: Record<string, unknown>;
  createdAt: Date;
}

const orders = new Map<string, Order>([
  ["order_200", { id: "order_200", amountTiyin: 990000, paid: false }]
]);

const transactions = new Map<string, Transaction>();
const auditEvents: AuditEvent[] = [];

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
      await this.recordAudit({
        event: "payme.create.duplicate",
        providerTransactionId: existing.id,
        orderId: existing.orderId,
        safePayload: { state: existing.state }
      });
      return existing;
    }

    transactions.set(input.id, input);
    await this.recordAudit({
      event: "payme.create.stored",
      providerTransactionId: input.id,
      orderId: input.orderId,
      safePayload: { amountTiyin: input.amountTiyin, state: input.state }
    });
    return input;
  },
  async findTransaction(id: string): Promise<Transaction | null> {
    return transactions.get(id) ?? null;
  },
  async setTransactionState(
    id: string,
    state: PaymentState,
    timestampField: "performTime" | "cancelTime",
    timestamp: number,
    reason?: number
  ): Promise<Transaction | null> {
    const transaction = transactions.get(id);
    if (!transaction) {
      return null;
    }

    transaction.state = state;
    transaction[timestampField] = transaction[timestampField] ?? timestamp;
    if (reason !== undefined) {
      transaction.reason = transaction.reason ?? reason;
    }
    return transaction;
  },
  async statement(from: number, to: number): Promise<Transaction[]> {
    return [...transactions.values()]
      .filter((transaction) => {
        return transaction.createTime >= from && transaction.createTime <= to;
      })
      .sort((a, b) => a.createTime - b.createTime);
  },
  async recordAudit(input: Omit<AuditEvent, "createdAt">): Promise<void> {
    auditEvents.push({ ...input, createdAt: new Date() });
  },
  async listAuditEvents(): Promise<AuditEvent[]> {
    return auditEvents;
  }
};
