# Payme Production Checklist

Use this checklist before enabling Payme Merchant API traffic in production.

Official documentation reviewed while hardening this SDK:

- Payme Merchant API request format: `https://developer.help.paycom.uz/protokol-merchant-api/format-zaprosa/`
- Payme Merchant API response format: `https://developer.help.paycom.uz/protokol-merchant-api/format-otveta/`
- Payme interaction flow: `https://developer.help.paycom.uz/protokol-merchant-api/skhema-vzaimodeystviya/`
- Payme Merchant API errors: `https://developer.help.paycom.uz/metody-merchant-api/oshibki-errors/`
- Payme data types and states: `https://developer.help.paycom.uz/metody-merchant-api/tipy-dannykh/`

## Authentication

- Configure Basic auth as `base64(login:password)`.
- Use the Payme-issued login for `basicAuthUsername`.
- Use the Payme cashbox key as `secretKey`.
- Keep both values in server-side environment variables only.
- Do not log the `Authorization` header.
- Optionally restrict ingress to the Payme Business IP ranges listed in the current official docs.

## Request Handling

- Accept only HTTPS traffic in production.
- Parse JSON safely and reject malformed provider payloads.
- Treat every provider request as untrusted until schema validation and auth succeed.
- Return HTTP 200 with the provider RPC error body for provider-level errors.
- Never return stack traces or raw database errors to Payme.

## Amounts

- Payme amounts are positive integer tiyin values.
- [ ] Validate order availability (e.g., `status = "pending"`, items in stock).
- [ ] Enforce idempotency: repeated CreateTransaction with the same transaction ID must return the same stored transaction.
- [ ] Refuse the transaction if the application `order.amount` does not perfectly match `amount` (returning `-31001` / `INVALID_AMOUNT`). 

## PerformTransaction Validation

- [ ] Ensure idempotency: repeated PerformTransaction with the same transaction ID must return success safely.
- [ ] Persist the `transactionState` to Payme state `2` safely before order fulfillment or before marking it paid.
- [ ] Ensure you record a durable timestamp of the perform time.

## CancelTransaction Validation

- [ ] If cancelled before PerformTransaction, map the transaction back to Payme state `-1`.
- [ ] If cancelled after PerformTransaction, map the transaction state to `-2`.
- [ ] Retain the `reason` field securely when Payme provides it on cancellation.

## Statement & Reconciliation Validation

- [ ] Ensure `GetStatement` retrieves items sorted natively via database by ascending creation time.

## Operational Readiness

- [ ] **No Raw Card Data:** Ensure no frontend form captures raw user card details. SDK callbacks are for server-side endpoints only.
- [ ] **Monitoring:** Implement standard application metrics monitoring for unexpected exceptions in your payload parsers.
- [ ] **Alerting:** Set up actionable alerts if the integration repeatedly throws unhandled `SystemErrors`.
- [ ] **Backups:** Implement point-in-time recovery for the SQL tables handling your payment and order lifecycles.
- [ ] **Manual Reconciliation:** Configure access for operations staff to verify database orders against your Payme dashboard.
- [ ] **Rollback Procedure:** Ensure you have a clear runbook to deactivate the webhook endpoints safely in a production incident.
- Never trust frontend amount values.

## Transactions

- Persist transactions in durable storage before confirming business actions.
- Keep `provider + provider_transaction_id` unique.
- Store Payme `CreateTransaction.params.time`; `GetStatement` should filter and sort using that provider creation time.
- Do not include failed `CreateTransaction` attempts in `GetStatement`.
- Reserve inventory or lock the order after successful creation when your business requires it.
- Prevent user-side order edits after transaction creation.

## Idempotency

- `CreateTransaction` can be repeated when Payme loses the response.
- `PerformTransaction` can be repeated when Payme loses the response.
- `CancelTransaction` should return the stored cancellation result for repeated calls.
- `CheckTransaction` must read durable local state and return the same state until a real transition occurs.
- Do not create duplicate transaction rows for repeated provider transaction IDs.

## State Mapping

Payme states:

- `1`: transaction created, awaiting confirmation
- `2`: transaction completed
- `-1`: transaction cancelled from created state
- `-2`: transaction cancelled after completion

Map these to your application states carefully. Do not mark an order paid before
the transaction is durably confirmed.

## Error Mapping

- `-32600`: missing or invalid RPC fields/params.
- `-32700`: JSON parse error.
- `-32300`: request method is not POST.
- `-32601`: unsupported method, with method name in `data`.
- `-32504`: unauthorized request.
- `-32400`: system/internal failure. Use only when your system cannot safely decide.
- `-31001`: amount mismatch.
- `-31003`: transaction not found.
- `-31007`: cannot cancel because goods/services were fully provided.
- `-31008`: state does not allow the operation.
- `-31050` to `-31099`: invalid account/customer input. Include the account subfield in `data`.

Verify final messages and `data` values against your Payme sandbox before launch.

## Sandbox Sign-off

- Check success path: check, create, perform, check, statement.
- Check order-not-found path.
- Check amount mismatch path.
- Check repeated `CreateTransaction`.
- Check repeated `PerformTransaction`.
- Check cancellation from created state.
- Check cancellation after performed state if your business supports refunds through Payme flow.
- Compare Payme statement with local transaction records.
