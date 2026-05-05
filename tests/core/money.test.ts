import { describe, expect, it } from "vitest";
import { InvalidAmountError, formatUZS, fromTiyin, toTiyin } from "@uz-payments/core";

describe("money helpers", () => {
  it("converts UZS to tiyin safely", () => {
    expect(toTiyin(10)).toBe(1000);
    expect(toTiyin(10.5)).toBe(1050);
    expect(toTiyin(10.05)).toBe(1005);
  });

  it("converts tiyin to UZS", () => {
    expect(fromTiyin(1005)).toBe(10.05);
  });

  it("formats UZS amounts", () => {
    expect(formatUZS(123456789)).toBe("1 234 567.89 UZS");
  });

  it("rejects invalid amounts", () => {
    expect(() => toTiyin(-1)).toThrow(InvalidAmountError);
    expect(() => toTiyin(1.234)).toThrow(InvalidAmountError);
    expect(() => fromTiyin(10.5)).toThrow(InvalidAmountError);
  });

  it("rejects unsafe integer amounts", () => {
    expect(() => fromTiyin(Number.MAX_SAFE_INTEGER + 1)).toThrow(InvalidAmountError);
    expect(() => toTiyin(Number.MAX_SAFE_INTEGER)).toThrow(InvalidAmountError);
  });
});
