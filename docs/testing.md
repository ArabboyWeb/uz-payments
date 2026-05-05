# Testing

Run local checks:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Payment integrations need more than unit tests before production:

- provider sandbox tests
- authentication failure tests
- amount mismatch tests
- repeated create/perform/cancel request tests
- database transaction rollback tests
- order-not-found tests
- transaction-not-found tests
- safe logging checks

Do not switch a merchant integration to production until the provider sandbox
flow and failure cases are verified against official documentation.
