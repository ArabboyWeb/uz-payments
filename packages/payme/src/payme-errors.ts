export type PaymeErrorKey =
  | "ORDER_NOT_FOUND"
  | "INVALID_AMOUNT"
  | "CANNOT_PERFORM"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_ALREADY_DONE"
  | "TRANSACTION_CANCELLED"
  | "CANNOT_CANCEL_AFTER_DELIVERY"
  | "UNAUTHORIZED"
  | "INVALID_REQUEST"
  | "METHOD_NOT_FOUND"
  | "METHOD_NOT_POST"
  | "PARSE_ERROR"
  | "SYSTEM_ERROR";

export interface PaymeErrorDefinition {
  key: PaymeErrorKey;
  code: number;
  message: {
    ru: string;
    uz: string;
    en: string;
  };
  data?: string;
}

/**
 * Merchant-side defaults based on Payme Business Merchant API docs.
 *
 * Provider-specific behavior can still vary by merchant account setup. Before
 * production, verify messages, account subfield names in `data`, and edge-case
 * retry behavior in Payme Business sandbox with the merchant's current docs.
 */
export const PAYME_ERRORS: Record<PaymeErrorKey, PaymeErrorDefinition> = {
  ORDER_NOT_FOUND: {
    key: "ORDER_NOT_FOUND",
    code: -31050,
    message: {
      ru: "Заказ не найден",
      uz: "Buyurtma topilmadi",
      en: "Order not found"
    },
    data: "account"
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
    code: -31008,
    message: {
      ru: "Транзакция отменена",
      uz: "Tranzaksiya bekor qilingan",
      en: "Transaction cancelled"
    }
  },
  CANNOT_CANCEL_AFTER_DELIVERY: {
    key: "CANNOT_CANCEL_AFTER_DELIVERY",
    code: -31007,
    message: {
      ru: "Невозможно отменить транзакцию. Товар или услуга предоставлена покупателю в полном объеме.",
      uz: "Tranzaksiyani bekor qilib bo'lmaydi. Tovar yoki xizmat to'liq taqdim etilgan.",
      en: "Cannot cancel transaction after goods or services were fully provided"
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
  },
  METHOD_NOT_POST: {
    key: "METHOD_NOT_POST",
    code: -32300,
    message: {
      ru: "Метод запроса должен быть POST",
      uz: "So'rov metodi POST bo'lishi kerak",
      en: "Request method must be POST"
    }
  },
  PARSE_ERROR: {
    key: "PARSE_ERROR",
    code: -32700,
    message: {
      ru: "Ошибка парсинга JSON",
      uz: "JSON parse xatosi",
      en: "JSON parse error"
    }
  },
  SYSTEM_ERROR: {
    key: "SYSTEM_ERROR",
    code: -32400,
    message: {
      ru: "Системная ошибка",
      uz: "Tizim xatosi",
      en: "System error"
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
    this.data = data ?? PAYME_ERRORS[key].data;
  }
}
