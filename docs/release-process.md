# Release Process

This document describes the steps to release new versions of the `@uz-payments` packages.

## 1. Local Validation

Before initiating any release, ensure the repository meets the organization-ready standard:

```bash
# 1. Ensure clean slate
pnpm install --frozen-lockfile

# 2. Check standards
pnpm format:check
pnpm lint

# 3. Verify types and tests
pnpm typecheck
pnpm test

# 4. Build projects
pnpm build

# 5. Pack dry-run & smoke test
pnpm smoke:pack
```

## 2. Sandbox Validation

Do NOT publish if a new architecture/flow feature was added without running it through real Payme Sandbox tests.

- Ensure `docs/final-validation-report.md` reflects live sandbox testing states depending on the nature of the change.

## 3. Version Bumping

Use standard semantic-versioning for the workspace.

## 4. Updates to CHANGELOG

Update `CHANGELOG.md` highlighting what changes occurred, breaking changes, and relevant architectural decisions.

## 5. Publishing

After local tests pass and CI passes (`.github/workflows/ci.yml`), you can publish to NPM:

```bash
pnpm -r publish --access public
```

_Note: Since the packages are intertwined, it is highly recommended to use a unified version matching system (e.g. all 0.1.0)._

> **Publish Rules:**
>
> - A release MUST NOT contain mock implementations or non-functional gateway stub code packaged dynamically.
> - Documentation MUST not claim full enterprise-readiness without explicit warnings regarding application-side requirements (idempotency, amounts validation, durable persistence).
