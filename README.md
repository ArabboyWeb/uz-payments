# uz-payments

TypeScript-first payment infrastructure SDK for Uzbekistan-focused applications.

<p>
  <a href="#english">English</a> |
  <a href="#ozbekcha">O'zbekcha</a> |
  <a href="#russian">Русский</a> |
  <a href="#interactive-quick-links">Quick Links</a>
</p>

`uz-payments` helps developers integrate Uzbekistan payment providers with safer
amount handling, typed provider callbacks, request validation, state modeling,
framework adapters, and production-oriented documentation.

> **Status:** Organization-ready SDK release candidate for Payme integrations, subject to merchant-side sandbox validation and production checklist completion.  
> This is a server-side framework implementation—it is not a payment processor and does not hold or store raw card data.

This project is not affiliated with Payme, Click, Uzum, inPAY, Paynet, Apelsin,
any bank, or any provider. Current active gateway implementation is Payme. Planned providers remain roadmap-only. Always verify integrations against the
provider's official documentation and sandbox before production use.

This SDK is a developer integration toolkit. It is not a payment processor, bank,
merchant account provider, or card processing system. It must never store raw
card data and must never expose provider secrets to frontend code.

<a id="interactive-quick-links"></a>

## Interactive Quick Links

<details open>
<summary><strong>Start here</strong></summary>

- [Install packages](#installation)
- [Quick start](#quick-start)
- [Payme callback example](#payme-example)
- [Express adapter](#express)
- [Next.js App Router adapter](#nextjs-app-router)
- [Supported providers](#supported-providers)
- [Security rules](#security-rules)
- [Development commands](#development)

</details>

<details>
<summary><strong>Repository areas</strong></summary>

- `packages/core` - money, states, errors, provider contracts, audit/idempotency types
- `packages/payme` - Payme Merchant API provider
- `packages/express` - Express adapter
- `packages/next` - Next.js App Router adapter
- `examples/express-postgres` - Express + PostgreSQL-style example
- `examples/nextjs-app-router` - Next.js App Router example
- `docs` - provider roadmap, security, database, state machine, testing docs

</details>

<a id="english"></a>

## English

`uz-payments` is an open-source TypeScript-first payment infrastructure SDK for
Uzbekistan-focused applications: e-commerce, SaaS, Telegram bots, marketplaces,
CRM systems, delivery platforms, online education platforms, and service
businesses.

The MVP implements:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

Click, Uzum, inPAY, Paynet, Apelsin, and bank gateways are planned only in
roadmap documentation until their official merchant flows are verified.

<a id="ozbekcha"></a>

## O'zbekcha

`uz-payments` - O'zbekiston bozoriga yo'naltirilgan ilovalar uchun
TypeScript-first ochiq manbali to'lov infratuzilmasi SDK.

U e-commerce, SaaS, Telegram botlar, marketplace, CRM, yetkazib berish,
onlayn ta'lim va xizmat ko'rsatish bizneslariga to'lov provayderlarini xavfsiz
va tartibli integratsiya qilishga yordam beradi.

MVP tarkibi:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

Click, Uzum, inPAY, Paynet, Apelsin va bank gateway integratsiyalari hozircha
faqat roadmap hujjatlarida turadi. Ular rasmiy merchant flow, autentifikatsiya,
xatolik mapping va test strategiyasi tekshirilmaguncha source package sifatida
qo'shilmaydi.

Muhim qoida: SDK raw card data saqlamaydi va provider secret qiymatlarini
frontend kodga chiqarmaydi.

<a id="russian"></a>

## Русский

`uz-payments` - open-source TypeScript-first SDK для платежной инфраструктуры
приложений, ориентированных на рынок Узбекистана.

Проект помогает безопаснее интегрировать платежных провайдеров в e-commerce,
SaaS, Telegram-боты, marketplace-платформы, CRM, доставку, онлайн-образование и
сервисные бизнесы.

MVP включает:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

Click, Uzum, inPAY, Paynet, Apelsin и банковские gateway-интеграции пока
описаны только в roadmap. Они не будут добавлены как source packages, пока не
будут проверены официальные merchant flow, аутентификация, mapping ошибок и
стратегия тестирования.

Важное правило: SDK не хранит raw card data и не передает provider secrets во
frontend-код.

## Supported Providers

| Provider      | Status             |
| ------------- | ------------------ |
| Payme         | MVP implementation |
| Click         | Planned            |
| Uzum          | Planned            |
| inPAY         | Planned            |
| Paynet        | Planned            |
| Apelsin       | Planned            |
| Bank gateways | Research required  |

Unsupported providers are documented only in the roadmap. They are not faked in
source code.

## Installation

```bash
pnpm add @uz-payments/core @uz-payments/payme
pnpm add @uz-payments/express
pnpm add @uz-payments/next
```

MVP workspace packages:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

Future provider packages should be added only after official flows are verified:

- `@uz-payments/click`
- `@uz-payments/uzum`
- `@uz-payments/inpay`
- `@uz-payments/paynet`
- `@uz-payments/apelsin`

## Quick Start

```ts
import { PaymentState, fromTiyin, toTiyin } from "@uz-payments/core";
import { PaymeProvider } from "@uz-payments/payme";

const amount = toTiyin(12500);
const display = fromTiyin(amount);
const state: PaymentState = "CREATED";

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!
});
```

Amounts are represented internally in tiyin. Never trust frontend-provided
amounts. Always load the order server-side and compare the provider amount with
the stored order amount.

## Payme Example

```ts
import { PaymeProvider, type PaymeCallbacks } from "@uz-payments/payme";

const payme = new PaymeProvider({
  merchantId: process.env.PAYME_MERCHANT_ID!,
  secretKey: process.env.PAYME_SECRET_KEY!
});

const callbacks: PaymeCallbacks = {
  async checkPerformTransaction(ctx) {
    const order = await db.orders.findById(String(ctx.account.order_id ?? ""));

    if (!order) {
      return { ok: false, reason: "ORDER_NOT_FOUND" };
    }

    if (order.amountTiyin !== ctx.amount) {
      return { ok: false, reason: "INVALID_AMOUNT" };
    }

    return { ok: true };
  },

  async createTransaction(ctx) {
    const existing = await db.transactions.findByProviderId(ctx.transactionId);
    if (existing) {
      return { create_time: existing.createTime, state: 1 };
    }

    await db.transactions.create({
      provider: "payme",
      providerTransactionId: ctx.transactionId,
      orderId: String(ctx.account.order_id ?? ""),
      amountTiyin: ctx.amount,
      state: "CREATED",
      rawPayload: ctx.rawPayload
    });

    return { create_time: ctx.providerTime, state: 1 };
  },

  async performTransaction(ctx) {
    await db.transactions.markConfirmed(ctx.transactionId);
    await db.orders.markPaidByTransaction(ctx.transactionId);
    return { perform_time: Date.now(), state: 2 };
  },

  async cancelTransaction(ctx) {
    await db.transactions.cancel(ctx.transactionId);
    return { cancel_time: Date.now(), state: -1 };
  },

  async checkTransaction(ctx) {
    return db.transactions.toPaymeState(ctx.transactionId);
  },

  async getStatement(ctx) {
    return { transactions: await db.transactions.statement(ctx.from, ctx.to) };
  }
};

const response = await payme.handleRequest(payload, headers, callbacks);
```

The Payme handler validates JSON-RPC shape, method names, Basic auth, and params.
It never writes to your database directly. All business behavior lives in your
callbacks.

Verify exact Payme codes, edge cases, repeated request behavior, and sandbox
behavior against Payme's current official Merchant API documentation before
production use.

Local live callback runner (requires your deployed HTTPS endpoint and sandbox creds):

```bash
PAYME_LIVE_URL="https://your-domain.example/payme" \
PAYME_AUTH_LOGIN="Paycom" \
PAYME_SECRET_KEY="cashbox_key" \
PAYME_ORDER_ID="order_100" \
PAYME_AMOUNT_TIYIN="125000" \
pnpm payme:live
```

## Express

```ts
import express from "express";
import { createPaymeExpressHandler } from "@uz-payments/express";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.post("/payme", createPaymeExpressHandler(payme, callbacks));
```

See `examples/express-postgres`.

## Next.js App Router

```ts
import { createPaymeNextHandler } from "@uz-payments/next";
import { callbacks, payme } from "@/lib/payme";

export const runtime = "nodejs";
export const POST = createPaymeNextHandler(payme, callbacks);
```

See `examples/nextjs-app-router`.

## State Machine

Generic SDK states:

```txt
PENDING -> CHECKED -> CREATED -> CONFIRMED -> SETTLED
                            |             |
                            v             v
                       CANCELLED       REFUNDED
                            ^
                            |
                          FAILED
```

Allowed transitions:

- `PENDING -> CHECKED`
- `CHECKED -> CREATED`
- `CREATED -> CONFIRMED`
- `CONFIRMED -> SETTLED`
- `CREATED -> CANCELLED`
- `CREATED -> FAILED`
- `CONFIRMED -> REFUNDED`

Use `canTransition` for checks and `assertCanTransition` or
`transitionPaymentState` when invalid transitions should throw typed errors.

## Security Rules

1. Never store raw card data.
2. Never expose provider secrets to frontend.
3. Always verify webhook/request authentication.
4. Always use HTTPS in production.
5. Always check order amount server-side.
6. Always persist transaction before confirming business action.
7. Always make create/perform/cancel idempotent.
8. Always test in sandbox before production.
9. Never trust frontend amount/order data.
10. Log safely; do not log secrets.
11. Do not use in-memory stores for production payment state.
12. Keep provider credentials only in server-side environment variables.
13. Treat all provider callbacks as untrusted input until validated.

<details>
<summary><strong>Security rules in O'zbekcha</strong></summary>

1. Raw card data saqlamang.
2. Provider secret qiymatlarini frontendga chiqarmang.
3. Webhook/request autentifikatsiyasini doim tekshiring.
4. Production muhitida HTTPS ishlating.
5. Order amount qiymatini doim server-side tekshiring.
6. Business action bajarishdan oldin transaction holatini saqlang.
7. Create/perform/cancel callbacklarini idempotent qiling.
8. Productiondan oldin sandboxda test qiling.
9. Frontenddan kelgan amount/order ma'lumotiga ishonmang.
10. Secretlarni log qilmang.
11. Production payment state uchun in-memory store ishlatmang.
12. Credentiallarni faqat server-side environment variablelarda saqlang.
13. Provider callbacklarini validationdan oldin ishonchsiz input deb hisoblang.

</details>

<details>
<summary><strong>Правила безопасности на русском</strong></summary>

1. Не храните raw card data.
2. Не передавайте provider secrets во frontend.
3. Всегда проверяйте аутентификацию webhook/request.
4. Используйте HTTPS в production.
5. Всегда проверяйте сумму заказа на сервере.
6. Сначала сохраняйте transaction, затем выполняйте бизнес-действие.
7. Делайте create/perform/cancel callbacks идемпотентными.
8. Перед production тестируйте интеграцию в sandbox.
9. Не доверяйте amount/order данным из frontend.
10. Не логируйте secrets.
11. Не используйте in-memory storage для production payment state.
12. Храните credentials только в server-side environment variables.
13. Считайте provider callbacks недоверенным input до validation.

</details>

## Development

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @uz-payments/core exec npm pack --dry-run
pnpm --filter @uz-payments/payme exec npm pack --dry-run
pnpm --filter @uz-payments/express exec npm pack --dry-run
pnpm --filter @uz-payments/next exec npm pack --dry-run
```

Fresh install verification checklist (recommended before any public release):

```bash
mkdir -p /tmp/uz-payments-smoke
cd /tmp/uz-payments-smoke
npm init -y
npm i typescript
```

Then install the tarballs produced by `npm pack` (or install from npm after publish) and run a
minimal `tsc` compile that imports:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

## Documentation

- `docs/security.md`
- `docs/database.md`
- `docs/state-machine.md`
- `docs/provider-contract.md`
- `docs/provider-roadmap.md`
- `docs/idempotency.md`
- `docs/payme-production-guide.md`
- `docs/payme-production-checklist.md`
- `docs/payme-troubleshooting.md`
- `docs/payme-validation-report.md`
- `docs/production-checklist.md`
- `docs/reconciliation.md`
- `docs/release-process.md`
- `CODE_OF_CONDUCT.md`

## Contributing

Provider packages require official documentation, known authentication flow,
documented request/webhook behavior, tested error mapping, idempotency notes,
and a sandbox or production-safe test strategy.

See `CONTRIBUTING.md`.

## License

MIT
