import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

/**
 * Smoke test script that:
 * 1. Packs all workspace packages into tarballs.
 * 2. Creates a temporary project.
 * 3. Installs the tarballs.
 * 4. Compiles a minimal TypeScript file that imports from all packages.
 */
async function main() {
  console.log("Starting smoke pack install test...");

  // 1. Pack tarballs
  const packages = ["core", "payme", "express", "next"];
  const tarballs: string[] = [];

  for (const pkg of packages) {
    console.log(`Packing @uz-payments/${pkg}...`);
    // NOTE: MUST use pnpm pack instead of npm pack so that workspace:* resolves
    const stdout = execSync(`pnpm pack`, {
      cwd: path.resolve(ROOT_DIR, `packages/${pkg}`),
      encoding: "utf-8"
    });
    const filename = stdout.trim().split("\n").pop()?.trim();
    if (!filename || !filename.endsWith(".tgz")) {
      throw new Error(`Failed to find tarball output for ${pkg}. Received: ${stdout}`);
    }
    const tarballPath = path.resolve(ROOT_DIR, `packages/${pkg}`, filename);
    tarballs.push(tarballPath);
    console.log(`Created: ${tarballPath}`);
  }

  // 2. Create temporary project directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "uz-payments-smoke-"));
  console.log(`Created temp project at ${tempDir}`);

  try {
    // 3. Initialize package.json and install tarballs
    execSync("npm init -y", { cwd: tempDir, stdio: "ignore" });
    
    // Install typescript and types
    console.log("Installing typescript and types dependencies...");
    execSync("npm install typescript @types/node @types/express", {
      cwd: tempDir,
      stdio: "inherit"
    });

    console.log("Installing packed tarballs...");
    const tarballPaths = tarballs.map(t => `"${t}"`).join(" ");
    execSync(`npm install ${tarballPaths}`, { cwd: tempDir, stdio: "inherit" });

    // Ensure we also install needed peer/transitive dependencies if missing
    // (Zod is a dependency of core/payme, next is needed as devDependency to avoid type errors)
    execSync("npm install zod express next", {
      cwd: tempDir,
      stdio: "inherit"
    });

    // Generate a minimal tsconfig.json
    await fs.writeFile(
      path.join(tempDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "es2022",
            module: "esnext",
            moduleResolution: "bundler",
            esModuleInterop: true,
            strict: true,
            skipLibCheck: true
          }
        },
        null,
        2
      )
    );

    // 4. Create and compile a minimal TS file
    console.log("Writing smoke test file...");
    const smokeFile = path.join(tempDir, "index.ts");
    await fs.writeFile(
      smokeFile,
      `
import { InvalidProviderPayloadError, toTiyin } from "@uz-payments/core";
import { PaymeProvider } from "@uz-payments/payme";
import { createPaymeExpressHandler } from "@uz-payments/express";
import { createPaymeNextHandler } from "@uz-payments/next";

console.log(InvalidProviderPayloadError.name);
console.log(typeof toTiyin);
console.log(PaymeProvider.name);
console.log(typeof createPaymeExpressHandler);
console.log(typeof createPaymeNextHandler);

const provider = new PaymeProvider({
  merchantId: "smoke-merchant",
  secretKey: "smoke-secret"
});

console.log(provider.name);
      `.trim()
    );

    console.log("Compiling smoke test file...");
    execSync("npx --yes tsc --noEmit", { cwd: tempDir, stdio: "inherit" });

    console.log("Running smoke test file...");
    // we need to use a compatible runtime (tsx) or compile to node. But simplest is running via tsx.
    execSync("npx --yes tsx index.ts", { cwd: tempDir, stdio: "inherit" });

    console.log("✅ Smoke pack install test passed successfully.");
  } finally {
    // Cleanup generated tarballs in root dir
    console.log("Cleaning up tarballs...");
    for (const tgz of tarballs) {
      try {
        await fs.rm(tgz, { force: true });
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
