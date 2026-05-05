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

- JSON-RPC 2.0 response formatting
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

Verify exact Payme provider codes, edge cases, repeated request rules, and
sandbox behavior against Payme's current official Merchant API documentation
before production use.
