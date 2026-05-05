# Bank Gateways

Status: Research required.

No bank gateway source package exists in the MVP.

Bank integrations should be added only where public or merchant documentation is
available and the request flow, credentials, authentication, error mapping,
idempotency behavior, and testing strategy can be verified.

The SDK must not handle raw card data unless a future design explicitly proves
PCI scope, legal requirements, and provider documentation. The current project
position is to avoid raw card data handling entirely.
