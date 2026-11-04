import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

async function findFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

const port = await findFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const username = "security-integration";
const password = randomBytes(48).toString("hex");
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CIVICSHIELD_COMMAND_CENTER_USER: username,
      CIVICSHIELD_COMMAND_CENTER_PASSWORD: password,
      CIVICSHIELD_COMMAND_CENTER_ORIGIN: baseUrl,
      CIVICSHIELD_SIMULATOR_URL: "http://127.0.0.1:1",
      CIVICSHIELD_PLATFORM_URL: "http://127.0.0.1:1"
    },
    stdio: "ignore"
  }
);

let serverExited = false;
let serverExitError;
server.once("error", (error) => {
  serverExited = true;
  serverExitError = error;
});
server.once("exit", (code) => {
  serverExited = true;
  if (code !== 0) serverExitError = new Error(`Next server exited with code ${code}`);
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (serverExited) throw serverExitError ?? new Error("Next server exited before startup");
    try {
      await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(1000) });
      ready = true;
      break;
    } catch {
      await delay(250);
    }
  }
  assert.equal(ready, true, "local Next server should become ready");

  const unauthenticatedPage = await fetch(`${baseUrl}/`);
  assert.equal(unauthenticatedPage.status, 401, "page should require authentication");
  assert.match(unauthenticatedPage.headers.get("www-authenticate") ?? "", /^Basic /);

  const authenticatedPage = await fetch(`${baseUrl}/`, {
    headers: { Authorization: authorization }
  });
  assert.equal(authenticatedPage.status, 200, "configured operator should load the page");

  const unauthenticatedAction = await fetch(`${baseUrl}/api/simulator/start`, {
    method: "POST"
  });
  assert.equal(unauthenticatedAction.status, 401, "simulator action should require authentication");

  const crossOriginAction = await fetch(`${baseUrl}/api/simulator/start`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      Origin: "https://attacker.invalid",
      "Sec-Fetch-Site": "cross-site"
    }
  });
  assert.equal(crossOriginAction.status, 403, "cross-origin action should be rejected");

  const sameOriginAction = await fetch(`${baseUrl}/api/simulator/start`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      Origin: baseUrl
    }
  });
  const sameOriginBody = await sameOriginAction.text();
  assert.equal(
    sameOriginAction.status,
    503,
    `authorized same-origin action should reach only the deliberately unavailable local simulator; received ${sameOriginAction.status}: ${sameOriginBody}`
  );

  process.stdout.write("Authentication and same-origin integration checks passed.\n");
} finally {
  if (!serverExited) {
    server.kill();
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      delay(3000)
    ]);
  }
}
