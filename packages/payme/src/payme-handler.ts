import {
  InvalidProviderPayloadError,
  ProviderMethodNotSupportedError,
  UnauthorizedWebhookError,
  assertValidTiyinAmount
} from "@uz-payments/core";

import type { PaymeCallbacks } from "./payme-callbacks";
import { PAYME_ERRORS, PaymeMerchantError } from "./payme-errors";
import {
  cancelTransactionParamsSchema,
  checkPerformParamsSchema,
  createTransactionParamsSchema,
  errorResponse,
  invalidRequestResponse,
  methodNotFoundResponse,
  parsePaymeRequest,
  statementParamsSchema,
  successResponse,
  transactionIdParamsSchema
} from "./payme-rpc";
import type { PaymeJsonRpcId, PaymeJsonRpcRequest, PaymeJsonRpcResponse } from "./payme-types";

function extractRequestId(payload: unknown): PaymeJsonRpcId | undefined {
  if (typeof payload !== "object" || payload === null || !("id" in payload)) {
    return undefined;
  }

  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" || typeof id === "number" || id === null ? id : undefined;
}

function assertValidParams<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) {
    throw new InvalidProviderPayloadError("Invalid Payme method params");
  }

  return result.data;
}

function toSafePaymeError(error: unknown): PaymeMerchantError {
  if (error instanceof PaymeMerchantError) {
    return error;
  }

  if (error instanceof UnauthorizedWebhookError) {
    return new PaymeMerchantError("UNAUTHORIZED");
  }

  if (error instanceof ProviderMethodNotSupportedError) {
    return new PaymeMerchantError("METHOD_NOT_FOUND");
  }

  if (error instanceof InvalidProviderPayloadError) {
    return new PaymeMerchantError("INVALID_REQUEST");
  }

  return new PaymeMerchantError("CANNOT_PERFORM");
}

export async function handlePaymeRpcRequest(
  request: PaymeJsonRpcRequest,
  callbacks: PaymeCallbacks
): Promise<PaymeJsonRpcResponse> {
  switch (request.method) {
    case "CheckPerformTransaction": {
      const params = assertValidParams(checkPerformParamsSchema.safeParse(request.params));
      assertValidTiyinAmount(params.amount);

      const result = await callbacks.checkPerformTransaction({
        amount: params.amount,
        account: params.account,
        rawPayload: request
      });

      if (!result.ok) {
        throw new PaymeMerchantError(result.reason, result.data);
      }

      return successResponse(request.id, { allow: true });
    }

    case "CreateTransaction": {
      const params = assertValidParams(createTransactionParamsSchema.safeParse(request.params));
      assertValidTiyinAmount(params.amount);

      const result = await callbacks.createTransaction({
        transactionId: params.id,
        providerTime: params.time,
        amount: params.amount,
        account: params.account,
        rawPayload: request
      });

      return successResponse(request.id, {
        create_time: result.create_time,
        transaction: result.transaction ?? params.id,
        state: result.state ?? 1
      });
    }

    case "PerformTransaction": {
      const params = assertValidParams(transactionIdParamsSchema.safeParse(request.params));
      const result = await callbacks.performTransaction({
        transactionId: params.id,
        rawPayload: request
      });

      return successResponse(request.id, {
        perform_time: result.perform_time,
        transaction: result.transaction ?? params.id,
        state: result.state ?? 2
      });
    }

    case "CancelTransaction": {
      const params = assertValidParams(cancelTransactionParamsSchema.safeParse(request.params));
      const result = await callbacks.cancelTransaction({
        transactionId: params.id,
        ...(params.reason !== undefined ? { reason: params.reason } : {}),
        rawPayload: request
      });

      return successResponse(request.id, {
        cancel_time: result.cancel_time,
        transaction: result.transaction ?? params.id,
        state: result.state ?? -1
      });
    }

    case "CheckTransaction": {
      const params = assertValidParams(transactionIdParamsSchema.safeParse(request.params));
      const result = await callbacks.checkTransaction({
        transactionId: params.id,
        rawPayload: request
      });

      return successResponse(request.id, {
        create_time: result.create_time,
        ...(result.perform_time !== undefined ? { perform_time: result.perform_time } : {}),
        ...(result.cancel_time !== undefined ? { cancel_time: result.cancel_time } : {}),
        transaction: result.transaction ?? params.id,
        state: result.state,
        ...(result.reason !== undefined ? { reason: result.reason } : {})
      });
    }

    case "GetStatement": {
      const params = assertValidParams(statementParamsSchema.safeParse(request.params));
      const result = await callbacks.getStatement({
        from: params.from,
        to: params.to,
        rawPayload: request
      });

      return successResponse(request.id, { transactions: result.transactions });
    }

    default:
      throw new ProviderMethodNotSupportedError(`Unsupported Payme method: ${request.method}`);
  }
}

export async function safeHandlePaymeRpcRequest(
  payload: unknown,
  callbacks: PaymeCallbacks,
  authenticate: () => void
): Promise<PaymeJsonRpcResponse> {
  const id = extractRequestId(payload);

  try {
    authenticate();
    const request = parsePaymeRequest(payload);
    return await handlePaymeRpcRequest(request, callbacks);
  } catch (error) {
    if (error instanceof ProviderMethodNotSupportedError) {
      return methodNotFoundResponse(id);
    }

    if (error instanceof InvalidProviderPayloadError) {
      return invalidRequestResponse(id);
    }

    return errorResponse(id, toSafePaymeError(error));
  }
}

export { PAYME_ERRORS };
