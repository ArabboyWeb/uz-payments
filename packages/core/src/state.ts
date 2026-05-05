import { InvalidStateTransitionError } from "./errors";

export type PaymentState =
  | "PENDING"
  | "CHECKED"
  | "CREATED"
  | "CONFIRMED"
  | "SETTLED"
  | "CANCELLED"
  | "FAILED"
  | "REFUNDED";

const VALID_TRANSITIONS: ReadonlyMap<PaymentState, readonly PaymentState[]> = new Map([
  ["PENDING", ["CHECKED"]],
  ["CHECKED", ["CREATED"]],
  ["CREATED", ["CONFIRMED", "CANCELLED", "FAILED"]],
  ["CONFIRMED", ["SETTLED", "REFUNDED"]],
  ["SETTLED", []],
  ["CANCELLED", []],
  ["FAILED", []],
  ["REFUNDED", []]
]);

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return VALID_TRANSITIONS.get(from)?.includes(to) ?? false;
}

export function assertCanTransition(from: PaymentState, to: PaymentState): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(`Cannot transition payment from ${from} to ${to}`, {
      from,
      to
    });
  }
}

export function transitionPaymentState(from: PaymentState, to: PaymentState): PaymentState {
  assertCanTransition(from, to);
  return to;
}
