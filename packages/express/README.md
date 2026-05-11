# @uz-payments/express

Express adapter for `@uz-payments/payme`.

## Install

```bash
pnpm add @uz-payments/payme @uz-payments/express express
```

## Usage

```ts
import express from "express";
import { createPaymeExpressHandler } from "@uz-payments/express";
import { PaymeProvider } from "@uz-payments/payme";

const app = express();

app.use(express.json({ limit: "1mb" }));

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!,
  basicAuthUsername: process.env.PAYME_AUTH_LOGIN
});

app.post("/payme", createPaymeExpressHandler(payme, callbacks));
```

The adapter reads JSON request bodies, forwards headers to the provider, returns
Payme-compatible JSON responses, and avoids exposing stack traces or provider
secrets.

## License

MIT
