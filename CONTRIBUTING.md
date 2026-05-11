# Contributing

`uz-payments` aims to be a serious infrastructure SDK for Uzbekistan payment
integrations. Contributions should reduce integration risk and avoid unsupported
claims.

## Development

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

## Provider Requirements

Do not add a provider package based on guesses. A provider implementation needs:

- official merchant documentation
- verified request authentication
- documented webhook/request flow
- sandbox or production-safe testing strategy
- verified error mapping
- documented idempotency behavior
- no raw card data handling

Unsupported providers should stay in roadmap documentation until those items are
known.

## Code Standards

- Keep core framework-agnostic.
- Keep provider-specific behavior out of `@uz-payments/core`.
- Keep adapters thin.
- Do not log secrets.
- Do not put secrets in examples.
- Prefer typed errors and schema validation.
- Add tests for provider edge cases and repeated requests.

## Pull Requests

Include a summary, tests run, and any provider documentation used. If a provider
behavior is uncertain, document the limitation instead of hiding it.

Provider changes must include links or references to official merchant
documentation and sandbox evidence for request formats, authentication, error
mapping, and repeated request behavior. Public releases follow
`docs/release-process.md`.
