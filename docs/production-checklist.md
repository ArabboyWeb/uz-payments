# Production Checklist

- Provider merchant account is approved.
- Official provider documentation has been reviewed.
- Sandbox flow has been tested.
- HTTPS is enabled.
- Provider secrets are stored only in server-side environment variables.
- Request authentication is enforced.
- Order amount is loaded and checked server-side.
- Transaction rows are persisted before business fulfillment.
- Create, perform, and cancel callbacks are idempotent.
- Provider transaction ID is unique per provider.
- Logs redact secrets and authorization headers.
- No raw card data is stored.
- Database backups and monitoring are configured.
- Alerting exists for callback failures and suspicious retries.
- Rollback and manual reconciliation process is documented.
