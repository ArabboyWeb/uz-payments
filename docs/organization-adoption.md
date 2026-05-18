# Organization Adoption Guide

`uz-payments` provides strongly-typed, predictable infrastructure for handling Payme requests in a Node.js server environment.

Before adopting this SDK in a production environment, organizations must understand the security boundaries and their responsibilities.

## What the SDK Guarantees

1. **Request Integrity**: Validates all incoming Payme merchant requests against official JSON-RPC schemas before invoking your callbacks.
2. **Deterministic Errors**: Converts invalid states into the exact Payme Merchant API `-31xxx` error codes expected by the provider.
3. **Audit Safety**: Provides a `redactAuditPayload` utility that recursively strips secrets and authorization headers from callback payloads so you can safely log requests.
4. **Resiliency**: Blocks known failure modes such as accepting timestamps older than 12 hours (timeout enforcement) or malformed amount types.

## What the SDK DOES NOT Guarantee

1. **Database Integrity**: The SDK does not ship with an ORM or database mapping. Writing transaction states robustly to a database via the `PaymeCallbacks` interface is entirely your responsibility.
2. **Idempotency**: The SDK routes requests, but your callback implementation must handle idempotency. If Payme calls `CreateTransaction` twice with the same ID, your database query must return the existing transaction.
3. **Card Data Security**: This SDK does not manage, touch, or process PCI-DSS user card data. It only handles server-to-server merchant callbacks.
4. **Environment Security**: It is your responsibility to secure the execution environment, enforce HTTPS ingress, and handle IP whitelisting as mandated by Payme.

## When to Adopt

You are ready to adopt `uz-payments` into an organizational production flow when:

1. You have fully successfully passed the Payme Business sandbox testing tools.
2. You have implemented robust `toPaymeState()` mapping according to the cancellation scenarios mapped out in the docs.
3. You have read and fulfilled the `docs/payme-production-checklist.md`.
4. Your application validates that `amount` corresponds perfectly with the real cart/order amount stored in your system _before_ authorizing creation.

## Deployment Responsibilities

Organizations should ensure they have:

- **Monitoring**: Set up error alerts when `PaymeMerchantError` instances are constructed.
- **Alerting**: Alert on repeated cancellation or fallback behavior.
- **Backups**: Ensure payment database tables are strictly backed up with point-in-time recovery.
- **Reconciliation**: Setup daily automatic or manual reconciliation checking your DB amounts against the operator UI dashboard.
- **Incident Response**: Have a rollback mechanism and access to Payme dashboards to verify out-of-sync states manually if anomalies happen.
