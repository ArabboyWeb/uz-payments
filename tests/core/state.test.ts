import { describe, expect, it } from "vitest";
import {
  InvalidStateTransitionError,
  assertCanTransition,
  canTransition,
  transitionPaymentState
} from "@uz-payments/core";

describe("payment state transitions", () => {
  it("allows configured transitions", () => {
    expect(canTransition("PENDING", "CHECKED")).toBe(true);
    expect(canTransition("CHECKED", "CREATED")).toBe(true);
    expect(canTransition("CREATED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "SETTLED")).toBe(true);
    expect(canTransition("CREATED", "CANCELLED")).toBe(true);
    expect(canTransition("CREATED", "FAILED")).toBe(true);
    expect(canTransition("CONFIRMED", "REFUNDED")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(false);
    expect(() => assertCanTransition("PENDING", "CONFIRMED")).toThrow(
      InvalidStateTransitionError
    );
  });

  it("returns the new state through the strict helper", () => {
    expect(transitionPaymentState("CREATED", "CONFIRMED")).toBe("CONFIRMED");
  });
});
