# Next.js App Router Payme Example

> **Disclaimer:** This example application internally uses a simplified mock in-memory store for demonstration and portability. It is **NOT** a real, durable database implementation and should not be deployed to production as-is. Payme transactions require strict durable data storage.

This example shows a server-only Payme route handler for the Next.js App Router.

`app/api/payme/route.ts` exports:

```ts
export const POST = createPaymeNextHandler(payme, callbacks);
```

Keep provider credentials in server-side environment variables only. Do not pass
merchant secrets to components, browser bundles, or client actions.

## Production Pattern Shown

- Payme provider configuration lives in `lib/payme.ts`, a server-only module.
- callbacks load orders server-side and compare Payme amount against stored
  order amount.
- transaction writes are idempotent by Payme transaction ID.
- perform and cancel paths use a transaction boundary helper.
- audit events store safe metadata only.

The mock database is in-memory for example readability. Production systems must
use durable storage and real database transactions.
