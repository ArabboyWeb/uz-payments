# @uz-payments/next

Next.js App Router adapter for `@uz-payments/payme`.

## Install

```bash
pnpm add @uz-payments/payme @uz-payments/next
```

## Usage

```ts
import { createPaymeNextHandler } from "@uz-payments/next";
import { callbacks, payme } from "@/lib/payme";

export const runtime = "nodejs";

export const POST = createPaymeNextHandler(payme, callbacks);
```

Keep Payme credentials in server-only modules and environment variables. Do not
pass provider secrets to client components, browser bundles, or frontend actions.

## License

MIT
