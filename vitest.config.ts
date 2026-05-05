import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node"
  },
  resolve: {
    alias: {
      "@uz-payments/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@uz-payments/payme": new URL("./packages/payme/src/index.ts", import.meta.url).pathname,
      "@uz-payments/express": new URL("./packages/express/src/index.ts", import.meta.url).pathname,
      "@uz-payments/next": new URL("./packages/next/src/index.ts", import.meta.url).pathname
    }
  }
});
