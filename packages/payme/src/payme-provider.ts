import type { PaymentProvider } from "@uz-payments/core";

import { assertPaymeBasicAuth, validatePaymeConfig } from "./payme-auth";
import type { PaymeCallbacks } from "./payme-callbacks";
import { safeHandlePaymeRpcRequest } from "./payme-handler";
import type { PaymeJsonRpcResponse, PaymeProviderOptions } from "./payme-types";

export class PaymeProvider implements PaymentProvider {
  readonly name = "payme";
  readonly merchantId: string;

  /** @internal */
  readonly options: PaymeProviderOptions;

  constructor(options: PaymeProviderOptions) {
    validatePaymeConfig(options);
    this.options = options;
    this.merchantId = options.merchantId;
  }

  async handleRequest(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
    callbacks: PaymeCallbacks
  ): Promise<PaymeJsonRpcResponse> {
    return safeHandlePaymeRpcRequest(payload, callbacks, this.options, () => {
      assertPaymeBasicAuth(headers, this.options);
    });
  }
}
