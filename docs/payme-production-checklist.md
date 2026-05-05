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
- Store local order amounts in tiyin.
- Load the order server-side in `CheckPerformTransaction` and `CreateTransaction`.
- Return `-31001` when the Payme amount does not match the local order amount.
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
