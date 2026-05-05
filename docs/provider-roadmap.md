# Provider Roadmap

Future providers must be added only when:

- official documentation is available
- request authentication is understood
- webhook/request flow is documented
- sandbox or testing strategy exists
- error mapping is verified
- idempotency behavior is documented
- no raw card data handling is required

Do not add a provider based on guesses. Do not create placeholder source
packages. Roadmap documentation is acceptable until the provider flow is verified.

## Planned Providers

| Provider | Status | Notes |
|---|---|---|
| Payme | MVP implementation | Merchant API package exists. Production users must verify current official docs. |
| Click | Planned | Requires verified merchant docs, auth, error mapping, and retry behavior. |
| Uzum | Planned | Requires verified merchant docs and sandbox strategy. |
| inPAY | Planned | Requires verified merchant docs and request flow. |
| Paynet | Planned | Requires verified merchant docs and provider scope. |
| Apelsin | Planned | Requires verified merchant docs and auth flow. |
| Bank gateways | Research required | Add only where public or merchant documentation exists. |
