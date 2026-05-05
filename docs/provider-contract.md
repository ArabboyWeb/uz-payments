# Provider Contract

Provider packages should expose a typed provider class and typed callbacks.

Core rules:

- The provider handler validates provider payloads.
- The provider handler verifies request authentication.
- The provider handler formats provider-specific responses.
- The provider handler does not directly modify application databases.
- Application callbacks perform order lookup, transaction writes, and business
  state changes.
- Amounts are passed in provider-native minor units where applicable. For UZS,
  Payme amounts are handled as tiyin.
- Provider packages must document idempotency behavior and repeated requests.

Provider-specific logic must not leak into `@uz-payments/core`.
