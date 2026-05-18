# Payme Validation Report

Date: 2026-05-05

## Scope

This report validates the current `@uz-payments/payme` implementation against
the documented Payme Business Merchant API sandbox behavior that can be modeled
locally without merchant credentials.

No new providers were added.

## Important Limitation

This environment does not have Payme sandbox merchant credentials, a Payme-issued
Basic auth login/password, or a public callback URL registered in Payme Business.
Because of that, this run did not receive live traffic from Payme's hosted
sandbox.

Instead, the repository now includes a sandbox-style harness that sends Payme
Merchant API callback payloads into the real `PaymeProvider` implementation and
compares SDK output against the official Payme Business Merchant API contract.
The harness is intentionally CI-friendly and deterministic.

## Official References Used

- Request format: `https://developer.help.paycom.uz/protokol-merchant-api/format-zaprosa/`
- Response format: `https://developer.help.paycom.uz/protokol-merchant-api/format-otveta/`
- Interaction flow and repeated request behavior: `https://developer.help.paycom.uz/protokol-merchant-api/skhema-vzaimodeystviya/`
- Merchant API methods: `https://developer.help.paycom.uz/metody-merchant-api/`
- Error codes: `https://developer.help.paycom.uz/metody-merchant-api/oshibki-errors/`
- Data types and transaction states: `https://developer.help.paycom.uz/metody-merchant-api/tipy-dannykh/`
- GetStatement reconciliation behavior: `https://developer.help.paycom.uz/metody-merchant-api/getstatement/`

## Harness Added

Test file:

- `tests/payme/payme-sandbox-harness.test.ts`

## Live Sandbox Runner (Optional)

When you have a deployed HTTPS endpoint registered in Payme Business sandbox,
you can run a real callback suite from your machine and record sanitized logs:

```bash
PAYME_LIVE_URL="https://your-domain.example/payme" \
PAYME_AUTH_LOGIN="Paycom" \
PAYME_SECRET_KEY="cashbox_key" \
PAYME_ORDER_ID="order_100" \
PAYME_AMOUNT_TIYIN="125000" \
pnpm payme:live
```

The runner writes JSONL logs to `.payme-live/` and redacts `Authorization`.

## Live Results Table (Fill After Sandbox)

Record sandbox evidence here before claiming production readiness:

| Scenario                     | Expected         | Observed | Request ID | Timestamp | Result  |
| ---------------------------- | ---------------- | -------- | ---------- | --------- | ------- |
| CheckPerformTransaction      | allow true       |          |            |           | pending |
| CreateTransaction            | state 1          |          |            |           | pending |
| CreateTransaction duplicate  | same as create   |          |            |           | pending |
| PerformTransaction           | state 2          |          |            |           | pending |
| PerformTransaction duplicate | same as perform  |          |            |           | pending |
| CancelTransaction            | state -1 or -2   |          |            |           | pending |
| CancelTransaction duplicate  | same as cancel   |          |            |           | pending |
| CheckTransaction             | stable state     |          |            |           | pending |
| GetStatement                 | includes tx      |          |            |           | pending |
| Invalid auth                 | -32504           |          |            |           | pending |
| Invalid amount               | -31001 or -32600 |          |            |           | pending |
| Order not found              | -31050           |          |            |           | pending |
| Unknown transaction          | -31003           |          |            |           | pending |

The harness creates an in-memory merchant billing model with:

- orders stored server-side
- durable transaction records keyed by Payme transaction ID
- idempotent create, perform, cancel, check, and statement callbacks
- Payme states `1`, `2`, `-1`, `-2`
- sanitized raw request/response logs

Sanitization behavior:

- `Authorization` is replaced with `[REDACTED]`
- provider request and response bodies are retained for debugging
- no provider secret is written to logs

## Validated Flow

The harness simulates:

1. `CheckPerformTransaction`
2. `CreateTransaction`
3. `PerformTransaction`
4. `CancelTransaction`
5. `CheckTransaction`
6. `GetStatement`

The full-flow scenario confirms:

- successful check returns `{ result: { allow: true }, id }`
- create returns `create_time`, `transaction`, and state `1`
- perform returns `perform_time`, `transaction`, and state `2`
- cancel after perform returns `cancel_time`, `transaction`, and state `-2`
- check after cancel returns `perform_time`, `cancel_time`, state `-2`, and reason
- statement includes the transaction when `from <= time <= to`

## Repeated Request Scenarios

Confirmed:

- duplicate `CreateTransaction` returns the stored `create_time`, transaction ID, and state
- duplicate `PerformTransaction` returns the stored `perform_time`, transaction ID, and state
- duplicate `CancelTransaction` returns the stored `cancel_time`, transaction ID, and state

This matches the documented Payme behavior where requests may be repeated when
Payme Business loses a response.

## Response Format Validation

Confirmed:

- responses do not include a `jsonrpc` field
- success responses contain only `result` and `id`
- error responses contain only `error` and `id`
- `id` is echoed from the request
- error objects contain numeric `code` and localized `message.ru`, `message.uz`, `message.en`
- unsupported method includes method name in `error.data`

## Amount Validation

Confirmed:

- integer tiyin values are accepted
- float amounts are rejected with `-32600`
- negative amounts are rejected with `-32600`
- amount mismatch is represented as `-31001` through merchant callback behavior

## Auth Validation

Confirmed:

- valid Basic auth credentials are accepted
- invalid Basic auth credentials return `-32504`
- logs redact the `Authorization` header

## SDK Output vs Expected Payme Behavior

| Area              | Expected Payme behavior                       | SDK result                                          | Status    |
| ----------------- | --------------------------------------------- | --------------------------------------------------- | --------- |
| Response envelope | `result` or `error` plus `id`                 | matches                                             | confirmed |
| `jsonrpc` field   | absent                                        | absent                                              | confirmed |
| ID echo           | response `id` matches request `id`            | matches                                             | confirmed |
| Basic auth        | `base64(login:password)`                      | supported through `basicAuthUsername` + `secretKey` | confirmed |
| Amount            | positive integer tiyin                        | enforced for Payme params                           | confirmed |
| Duplicate create  | return stored transaction result              | supported by callback contract and harness          | confirmed |
| Duplicate perform | return stored perform result                  | supported by callback contract and harness          | confirmed |
| Duplicate cancel  | return stored cancel result                   | supported by callback contract and harness          | confirmed |
| Statement         | filter by Payme create time, sorted ascending | supported by callback contract and harness          | confirmed |

## Mismatches

No SDK response-format mismatch was found in the current implementation after
the previous hardening changes.

Live Payme-hosted sandbox validation remains pending because credentials and a
registered callback URL are not available in this environment.

The first public npm release can be prepared with this local harness, but the
project should not claim live Payme production readiness until this report is
updated with real Payme sandbox timestamps, request IDs, and observed responses.

## Fixes Applied

- added 12-hour provider timestamp timeout validation in SDK `CreateTransaction` handler
- added strict `-2` (cancelled after confirmed) state mapping to both Next.js and Express examples
- made SDK audit array redaction recursively safe
- added `reason` field parsing and mapping for refunds
- sandbox-style validation harness
- sanitized raw request/response capture inside the harness
- validation report documentation

No new provider packages were added.

## Remaining Production Risks

- Run the same scenarios against a real Payme Business sandbox account.
- Deploy either `examples/express-postgres` or `examples/nextjs-app-router` to a
  public HTTPS URL and register that URL in Payme Business.
- Confirm the Payme-issued Basic auth login for the merchant.
- Confirm account field names used in `error.data`.
- Confirm cancellation/refund policy for delivered goods or services.
- Confirm fiscalization requirements if the merchant uses receipt `detail` fields.
- Confirm production ingress IP restrictions against the latest Payme Business documentation.
