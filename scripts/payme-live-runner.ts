import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name];
}

function parsePositiveInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected positive integer, got "${value}"`);
  }
  return parsed;
}

function toBasicAuthHeader(username: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${username}:${secretKey}`).toString("base64")}`;
}

function redactAuthorization(headers: Record<string, string>): Record<string, string> {
  const lowered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    lowered[key.toLowerCase()] = key.toLowerCase() === "authorization" ? "[REDACTED]" : value;
  }
  return lowered;
}

function nowIsoCompact(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJsonl(filePath: string, record: JsonRecord): void {
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf8");
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    parsed = { nonJsonBody: text };
  }

  return { status: response.status, bodyText: text, bodyJson: parsed };
}

async function main() {
  const url = requireEnv("PAYME_LIVE_URL");
  const username = requireEnv("PAYME_AUTH_LOGIN");
  const secretKey = requireEnv("PAYME_SECRET_KEY");

  const orderId = requireEnv("PAYME_ORDER_ID");
  const amount = parsePositiveInt(requireEnv("PAYME_AMOUNT_TIYIN"), "PAYME_AMOUNT_TIYIN");

  const txId = optionalEnv("PAYME_TX_ID") ?? `tx_${Date.now()}`;
  const from = parsePositiveInt(
    optionalEnv("PAYME_STATEMENT_FROM") ?? String(Date.now() - 60_000),
    "PAYME_STATEMENT_FROM"
  );
  const to = parsePositiveInt(
    optionalEnv("PAYME_STATEMENT_TO") ?? String(Date.now() + 60_000),
    "PAYME_STATEMENT_TO"
  );

  const outDir = path.resolve(process.cwd(), ".payme-live");
  ensureDir(outDir);
  const outFile = path.join(outDir, `payme-live-${nowIsoCompact()}.jsonl`);

  const authHeader = toBasicAuthHeader(username, secretKey);
  const headers = { authorization: authHeader };

  const scenarios: Array<{
    scenario: string;
    expected: string;
    payload: JsonRecord;
  }> = [
    {
      scenario: "check",
      expected: "result.allow === true",
      payload: {
        id: 1,
        method: "CheckPerformTransaction",
        params: { amount, account: { order_id: orderId } }
      }
    },
    {
      scenario: "create",
      expected: "result.state === 1, result.transaction === txId",
      payload: {
        id: 2,
        method: "CreateTransaction",
        params: { id: txId, time: Date.now(), amount, account: { order_id: orderId } }
      }
    },
    {
      scenario: "create (duplicate)",
      expected: "same result as create (idempotent)",
      payload: {
        id: 3,
        method: "CreateTransaction",
        params: { id: txId, time: Date.now(), amount, account: { order_id: orderId } }
      }
    },
    {
      scenario: "perform",
      expected: "result.state === 2",
      payload: { id: 4, method: "PerformTransaction", params: { id: txId } }
    },
    {
      scenario: "perform (duplicate)",
      expected: "same result as perform (idempotent)",
      payload: { id: 5, method: "PerformTransaction", params: { id: txId } }
    },
    {
      scenario: "cancel",
      expected: "result.state === -1 or -2 depending on business policy",
      payload: { id: 6, method: "CancelTransaction", params: { id: txId, reason: 1 } }
    },
    {
      scenario: "cancel (duplicate)",
      expected: "same result as cancel (idempotent)",
      payload: { id: 7, method: "CancelTransaction", params: { id: txId, reason: 1 } }
    },
    {
      scenario: "checkTransaction",
      expected: "result.state reflects stored local transaction state",
      payload: { id: 8, method: "CheckTransaction", params: { id: txId } }
    },
    {
      scenario: "getStatement",
      expected: "result.transactions includes txId within [from,to] window if created",
      payload: { id: 9, method: "GetStatement", params: { from, to } }
    },
    {
      scenario: "invalid auth",
      expected: "error.code === -32504",
      payload: { id: 10, method: "CheckPerformTransaction", params: { amount, account: {} } }
    }
  ];

  // For "invalid auth" we intentionally override auth header for that request only.
  for (const step of scenarios) {
    const requestHeaders =
      step.scenario === "invalid auth"
        ? { authorization: toBasicAuthHeader(username, "wrong-secret") }
        : headers;

    const startedAt = new Date();
    const result = await postJson(url, requestHeaders, step.payload);

    writeJsonl(outFile, {
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      scenario: step.scenario,
      expected: step.expected,
      request: {
        url,
        headers: redactAuthorization(requestHeaders),
        body: step.payload
      },
      response: {
        status: result.status,
        body: result.bodyJson
      }
    });

    // Keep console output short; the JSONL file is the source of truth.
    const ok = result.status === 200 ? "ok" : `http_${result.status}`;
    console.log(`[${ok}] ${step.scenario}`);
  }

  console.log(`Wrote sanitized logs to ${outFile}`);
}

main().catch((error) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exitCode = 1;
});
