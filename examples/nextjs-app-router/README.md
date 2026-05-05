# Next.js App Router Example

This example shows a server-only Payme route handler for the Next.js App Router.

`app/api/payme/route.ts` exports:

```ts
export const POST = createPaymeNextHandler(payme, callbacks);
```

Keep provider credentials in server-side environment variables only. Do not pass
merchant secrets to components, browser bundles, or client actions.
