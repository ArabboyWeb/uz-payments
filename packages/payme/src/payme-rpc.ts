import { z } from "zod";
import { InvalidProviderPayloadError, ProviderMethodNotSupportedError } from "@uz-payments/core";

import { PAYME_ERRORS, PaymeMerchantError } from "./payme-errors";
import type { PaymeJsonRpcId, PaymeJsonRpcRequest, PaymeJsonRpcResponse, PaymeMethod } from "./payme-types";

export const PAYME_METHODS: readonly PaymeMethod[] = [
  "CheckPerformTransaction",
  "CreateTransaction",
  "PerformTransaction",
  "CancelTransaction",
  "CheckTransaction",
  "GetStatement"
];

const rpcIdSchema = z.union([z.string(), z.number(), z.null()]).optional();

export const paymeRequestSchema = z.object({
  jsonrpc: z.literal("2.0").optional(),
  id: rpcIdSchema,
  method: z.string(),
  params: z.unknown().optional()
});

const accountSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]));

export const checkPerformParamsSchema = z.object({
  amount: z.number().int().nonnegative().safe(),
  account: accountSchema
});

export const createTransactionParamsSchema = checkPerformParamsSchema.extend({
  id: z.string().min(1),
  time: z.number().int().nonnegative()
});

export const transactionIdParamsSchema = z.object({
  id: z.string().min(1)
});

export const cancelTransactionParamsSchema = transactionIdParamsSchema.extend({
  reason: z.number().int().optional()
});

export const statementParamsSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative()
});

export function parsePaymeRequest(payload: unknown): PaymeJsonRpcRequest {
  const parsed = paymeRequestSchema.safeParse(payload);

  if (!parsed.success) {
    throw new InvalidProviderPayloadError("Invalid Payme JSON-RPC request", {
      issues: parsed.error.issues
    });
  }

  return parsed.data as PaymeJsonRpcRequest;
}

export function assertSupportedPaymeMethod(method: string): asserts method is PaymeMethod {
  if (!PAYME_METHODS.includes(method as PaymeMethod)) {
    throw new ProviderMethodNotSupportedError(`Unsupported Payme method: ${method}`, { method });
  }
}

export function successResponse(id: PaymeJsonRpcId | undefined, result: Record<string, unknown>): PaymeJsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result
  };
}

export function errorResponse(id: PaymeJsonRpcId | undefined, error: PaymeMerchantError): PaymeJsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: error.definition.code,
      message: error.definition.message,
      ...(error.data ? { data: error.data } : {})
    }
  };
}

export function invalidRequestResponse(id: PaymeJsonRpcId | undefined, data?: string): PaymeJsonRpcResponse {
  const definition = PAYME_ERRORS.INVALID_REQUEST;

  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: definition.code,
      message: definition.message,
      ...(data ? { data } : {})
    }
  };
}

export function methodNotFoundResponse(id: PaymeJsonRpcId | undefined): PaymeJsonRpcResponse {
  const definition = PAYME_ERRORS.METHOD_NOT_FOUND;

  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code: definition.code,
      message: definition.message
    }
  };
}
