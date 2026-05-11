# Release Process

This project publishes separate npm packages from the monorepo:

- `@uz-payments/core`
- `@uz-payments/payme`
- `@uz-payments/express`
- `@uz-payments/next`

## Pre-release Requirements

- Payme behavior is verified against official documentation.
- Real Payme Business sandbox validation is recorded when provider behavior
  changes.
- No unsupported provider source packages are added.
- No raw card data handling is introduced.
- Package versions are intentionally chosen.

## Local Checks

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @uz-payments/core exec npm pack --dry-run
pnpm --filter @uz-payments/payme exec npm pack --dry-run
pnpm --filter @uz-payments/express exec npm pack --dry-run
pnpm --filter @uz-payments/next exec npm pack --dry-run
```

## Publishing

1. Confirm `NPM_TOKEN` is configured in GitHub repository secrets.
2. Create a GitHub release for the intended version.
3. The release workflow runs checks and publishes packages to npm.
4. Confirm package pages and install commands work from a fresh project.

Do not publish if real sandbox validation is required but missing.
