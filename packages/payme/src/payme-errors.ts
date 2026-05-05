export type PaymeErrorKey =
  | "ORDER_NOT_FOUND"
  | "INVALID_AMOUNT"
  | "CANNOT_PERFORM"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_ALREADY_DONE"
  | "TRANSACTION_CANCELLED"
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "METHOD_NOT_FOUND";

export interface PaymeErrorDefinition {
  key: PaymeErrorKey;
  code: number;
  message: {
    ru: string;
    uz: string;
    en: string;
  };
}

/**
 * Merchant-side defaults for common Payme failures.
 * Verify exact provider codes, messages, and edge cases against Payme's current
 * official Merchant API documentation before production use.
 */
export const PAYME_ERRORS: Record<PaymeErrorKey, PaymeErrorDefinition> = {
  ORDER_NOT_FOUND: {
    key: "ORDER_NOT_FOUND",
    code: -31050,
    message: {
      ru: "Заказ не найден",
      uz: "Buyurtma topilmadi",
      en: "Order not found"
    }
  },
  INVALID_AMOUNT: {
    key: "INVALID_AMOUNT",
    code: -31001,
    message: {
      ru: "Неверная сумма",
      uz: "Noto'g'ri summa",
      en: "Invalid amount"
    }
  },
  CANNOT_PERFORM: {
    key: "CANNOT_PERFORM",
    code: -31008,
    message: {
      ru: "Невозможно выполнить операцию",
      uz: "Operatsiyani bajarib bo'lmaydi",
      en: "Cannot perform operation"
    }
  },
  TRANSACTION_NOT_FOUND: {
    key: "TRANSACTION_NOT_FOUND",
    code: -31003,
    message: {
      ru: "Транзакция не найдена",
      uz: "Tranzaksiya topilmadi",
      en: "Transaction not found"
    }
  },
  TRANSACTION_ALREADY_DONE: {
    key: "TRANSACTION_ALREADY_DONE",
    code: -31008,
    message: {
      ru: "Транзакция уже выполнена",
      uz: "Tranzaksiya allaqachon bajarilgan",
      en: "Transaction already completed"
    }
  },
  TRANSACTION_CANCELLED: {
    key: "TRANSACTION_CANCELLED",
    code: -31007,
    message: {
      ru: "Транзакция отменена",
      uz: "Tranzaksiya bekor qilingan",
      en: "Transaction cancelled"
    }
  },
  UNAUTHORIZED: {
    key: "UNAUTHORIZED",
    code: -32504,
    message: {
      ru: "Недостаточно привилегий",
      uz: "Ruxsat etilmagan",
      en: "Unauthorized"
    }
  },
  INVALID_REQUEST: {
    key: "INVALID_REQUEST",
    code: -32600,
    message: {
      ru: "Неверный запрос",
      uz: "Noto'g'ri so'rov",
      en: "Invalid request"
    }
  },
  METHOD_NOT_FOUND: {
    key: "METHOD_NOT_FOUND",
    code: -32601,
    message: {
      ru: "Метод не найден",
      uz: "Metod topilmadi",
      en: "Method not found"
    }
  }
};

export class PaymeMerchantError extends Error {
  readonly definition: PaymeErrorDefinition;
  readonly data: string | undefined;

  constructor(key: PaymeErrorKey, data?: string) {
    super(PAYME_ERRORS[key].message.en);
    this.name = "PaymeMerchantError";
    this.definition = PAYME_ERRORS[key];
    this.data = data;
  }
}
