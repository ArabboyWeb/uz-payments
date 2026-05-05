import type { Request, Response } from "express";
import {
  invalidRequestResponse,
  parseErrorResponse,
  type PaymeCallbacks,
  type PaymeProvider
} from "@uz-payments/payme";

async function readJsonBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) {
    return req.body;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createPaymeExpressHandler(provider: PaymeProvider, callbacks: PaymeCallbacks) {
  return async function paymeExpressHandler(req: Request, res: Response): Promise<void> {
    try {
      const payload = await readJsonBody(req);
      const response = await provider.handleRequest(payload, req.headers, callbacks);
      res.status(200).json(response);
    } catch (error) {
      res
        .status(200)
        .json(
          error instanceof SyntaxError ? parseErrorResponse(null) : invalidRequestResponse(null)
        );
    }
  };
}
