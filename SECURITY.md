# Security Policy

Payment integrations are security-sensitive. Treat every provider request as
untrusted until validated.

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

## Reporting Vulnerabilities

Open a private security advisory when available, or contact the maintainers
privately before opening a public issue.

Do not include real secrets, raw card data, production customer data, or full
provider credentials in reports.

## Scope

The SDK validates provider request shape, authentication inputs, amount values,
and response formatting where implemented. Applications remain responsible for
database transactions, idempotency persistence, order validation, deployment
security, secret rotation, and provider account configuration.
