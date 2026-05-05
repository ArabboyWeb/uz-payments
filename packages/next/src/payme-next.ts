import {
  invalidRequestResponse,
  parseErrorResponse,
  type PaymeCallbacks,
  type PaymeProvider
} from "@uz-payments/payme";

function headersToRecord(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

export interface PaymeNextRequest {
  headers: Headers;
  json(): Promise<unknown>;
}

export function createPaymeNextHandler(provider: PaymeProvider, callbacks: PaymeCallbacks) {
  return async function paymeNextHandler(request: PaymeNextRequest): Promise<Response> {
    try {
      const payload = await request.json();
      const response = await provider.handleRequest(
        payload,
        headersToRecord(request.headers),
        callbacks
      );
      return Response.json(response);
    } catch (error) {
      return Response.json(
        error instanceof SyntaxError ? parseErrorResponse(null) : invalidRequestResponse(null)
      );
    }
  };
}
