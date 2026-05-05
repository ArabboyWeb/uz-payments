# Payme

Status: MVP implementation in `@uz-payments/payme`.

Implemented Merchant API method support:

- `CheckPerformTransaction`
- `CreateTransaction`
- `PerformTransaction`
- `CancelTransaction`
- `CheckTransaction`
- `GetStatement`

The package provides:

- Payme Merchant API RPC response formatting
- method validation
- params validation
- Basic auth validation helper
- typed callbacks
- merchant-side error mapping
- safe adapter error handling

Amounts are interpreted as tiyin.

The handler never writes to your database. It only calls application callbacks.
Applications must persist transaction state durably and make repeated provider
requests idempotent.

Verified against current official Payme Business docs:

- responses contain `result` or `error` plus `id`
- successful Payme amounts are positive integer tiyin values
- Basic auth uses `base64(login:password)`
- `CreateTransaction` and `PerformTransaction` may be repeated when Payme loses a response
- `GetStatement` is used for reconciliation and must filter by Payme creation time
- Payme transaction states are `1`, `2`, `-1`, and `-2`

Remaining production behavior still depends on the merchant account and sandbox:

- exact Basic auth login
- account subfield names in `error.data`
- refund/cancellation policy after goods or services are delivered
- fiscalization fields if the merchant uses receipt details
