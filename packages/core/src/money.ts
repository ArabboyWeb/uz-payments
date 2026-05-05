import { InvalidAmountError } from "./errors";

const TIYIN_PER_UZS = 100;

function assertFiniteNonNegativeNumber(value: number, field: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidAmountError(`${field} must be a finite number`, { value });
  }

  if (value < 0) {
    throw new InvalidAmountError(`${field} must not be negative`, { value });
  }
}

function numberToPlainDecimal(value: number): string {
  const raw = value.toString();

  if (!/[eE]/.test(raw)) {
    return raw;
  }

  const fixed = value.toFixed(20);
  return fixed.replace(/0+$/, "").replace(/\.$/, "");
}

export function assertValidTiyinAmount(amount: number): void {
  assertFiniteNonNegativeNumber(amount, "amountTiyin");

  if (!Number.isInteger(amount)) {
    throw new InvalidAmountError("amountTiyin must be an integer", { amount });
  }

  if (!Number.isSafeInteger(amount)) {
    throw new InvalidAmountError("amountTiyin must be a safe integer", { amount });
  }
}

export function toTiyin(amountUZS: number): number {
  assertFiniteNonNegativeNumber(amountUZS, "amountUZS");

  const decimal = numberToPlainDecimal(amountUZS);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(decimal);

  if (!match) {
    throw new InvalidAmountError("amountUZS must be a decimal number", { amountUZS });
  }

  const [, whole, fraction = ""] = match;

  if (fraction.length > 2) {
    throw new InvalidAmountError("amountUZS must not have more than two decimal places", {
      amountUZS
    });
  }

  const tiyinText = `${whole}${fraction.padEnd(2, "0")}`;
  const tiyin = Number(tiyinText);

  assertValidTiyinAmount(tiyin);
  return tiyin;
}

export function fromTiyin(amountTiyin: number): number {
  assertValidTiyinAmount(amountTiyin);
  return amountTiyin / TIYIN_PER_UZS;
}

export function formatUZS(amountTiyin: number): string {
  assertValidTiyinAmount(amountTiyin);

  const whole = Math.floor(amountTiyin / TIYIN_PER_UZS);
  const fraction = String(amountTiyin % TIYIN_PER_UZS).padStart(2, "0");
  const grouped = whole.toLocaleString("en-US").replace(/,/g, " ");

  return `${grouped}.${fraction} UZS`;
}
