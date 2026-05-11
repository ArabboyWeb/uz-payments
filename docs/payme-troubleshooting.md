# Payme Troubleshooting

Use this guide when Payme callbacks fail or return unexpected merchant errors.

## `-32504` Unauthorized

Meaning: Payme Basic auth failed.

Check:

- `PAYME_AUTH_LOGIN` matches the login issued by Payme.
- `PAYME_SECRET_KEY` matches the cashbox key.
- The endpoint receives the `Authorization` header.
- Reverse proxies do not strip auth headers.

Do not log the full header value.

Safe debugging:

- log only `Authorization: [REDACTED]`
- record sanitized request/response samples for auditing
- do not include secrets in bug reports

## `-31001` Invalid Amount

Meaning: Payme amount does not match your server-side order amount.

Check:

- Local order amount is stored in tiyin.
- Frontend totals are not trusted for payment verification.
- Discounts, delivery fees, and currency conversion are already finalized before
  creating a payment.

## `-31003` Transaction Not Found

Meaning: Payme asked about a transaction your system cannot find.

Check:

- `provider_transaction_id` is stored exactly from Payme `params.id`.
- `provider + provider_transaction_id` has a unique index.
- Create callback writes transaction state before returning success.
- Database rollback did not happen after returning success to Payme.

## `-31008` Cannot Perform Operation

Meaning: current transaction or order state does not allow the requested action.

Common causes:

- order is already paid or cancelled
- transaction is already cancelled
- duplicate request is not handled idempotently
- merchant business rules reject the action

Repeated Payme requests should usually return the stored prior result when the
operation already succeeded.

## `-32700` JSON Parse Error

Meaning: request body is not valid JSON.

Check:

- endpoint accepts JSON body
- proxy does not alter the body
- framework adapter is reading the request body once
- Payme endpoint is not being hit by unrelated clients

Express note: if you use `express.json()`, invalid JSON can be rejected before
your handler runs. If you need full control over the Payme error body, do not
rely on framework default errors.

## Safe Debugging

- Redact `Authorization` headers.
- Do not log provider secrets.
- Do not store raw card data.
- Keep request/response samples sanitized before sharing them in issues.

## Common Merchant Mistakes

- amount is stored in UZS decimals instead of integer tiyin
- `CreateTransaction` is not idempotent and inserts duplicates
- `PerformTransaction` marks business state paid before the DB transaction commits
- cancellation/refund policy is implemented without confirming Payme rules in sandbox

## Proxy Pitfalls

- `Authorization` header stripped by nginx/CDN defaults
- request body read twice (one middleware consumes it, handler sees empty body)
- non-HTTPS callback URL registered in sandbox/production
