# Security

Payment integrations must be implemented defensively. The SDK helps with typed
primitives, validation, and response formatting, but your application is still
responsible for durable state, secrets, database transactions, and deployment
security.

## Required Rules

1. Never store raw card data.
2. Never expose provider secrets to frontend.
3. Always verify webhook/request authentication.
4. Always use HTTPS in production.
5. Always check order amount server-side.
6. Always persist transaction before confirming business action.
7. Always make create/perform/cancel idempotent.
8. Always test in sandbox before production.
9. Never trust frontend amount/order data.
10. Log safely; do not log secrets.
11. Do not use in-memory stores for production payment state.
12. Keep provider credentials only in server-side environment variables.
13. Treat all provider callbacks as untrusted input until validated.

## Logging

Audit payloads should be redacted before storage. Never log authorization
headers, provider secrets, passwords, tokens, or raw card data.

## Frontend Boundary

Frontend code may display order totals and payment status, but it must not
decide final payable amounts or receive provider credentials. Always reload the
order server-side in provider callbacks.
