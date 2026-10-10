"use strict";
// Boots the REAL portal-service app (app.js -> authenticate -> tenantContextWarn
// -> real routers/controllers/services/handlers) with:
//   - config/db.js stubbed (no Mongo connection),
//   - RabbitMQ disabled (RABBIT_URL empty),
//   - the PDP (user-service /policy/evaluate) stubbed to PERMIT and to return
//     the user from the gateway headers, as user-service does in production
//     (AUTH_BYPASS is NOT used; `authenticate` and tenantContextWarn run for real),
//   - the three tenant-owned models backed by tests/helpers/fakeModels.js.
const os = require("os");
const fs = require("fs");
const path = require("path");

process.env.LOG_ROOT =
  process.env.LOG_ROOT || fs.mkdtempSync(path.join(os.tmpdir(), "portal-tenant-"));
process.env.NODE_ENV = "test";
process.env.RABBIT_URL = "";
process.env.AUTH_BYPASS_ENABLED = "false";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-only-secret";

const dbPath = require.resolve("../../config/db");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: { mongooseConnection: async () => {} },
};

const fakes = require("./fakeModels");
fakes.install();

let quiet = true;
const orig = { log: console.log, warn: console.warn, error: console.error };
const warnings = [];
console.log = (...a) => (quiet ? undefined : orig.log(...a));
console.warn = (...a) => {
  warnings.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  if (!quiet) orig.warn(...a);
};
console.error = (...a) => (quiet ? undefined : orig.error(...a));

const { defaultPolicyMiddleware } = require("../../middlewares/policy.middleware");
const pdpCalls = [];
defaultPolicyMiddleware.policyClient.evaluateWithHeaders = async (
  headers,
  resource,
  action,
  context
) => {
  pdpCalls.push({ resource, action, tenantId: context.tenantId });
  return {
    success: true,
    decision: "PERMIT",
    user: {
      id: headers["x-user-id"],
      tenantId: headers["x-tenant-id"],
      userType: headers["x-user-type"],
      email: headers["x-user-email"],
      roles: [],
      permissions: [],
    },
  };
};

const app = require("../../app");

async function start() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

function gatewayHeaders({ tenantId, userId, userType, email = "u@example.com" }) {
  return {
    "content-type": "application/json",
    "x-jwt-verified": "true",
    "x-auth-source": "gateway",
    "x-user-id": userId,
    "x-tenant-id": tenantId,
    "x-user-type": userType || "",
    "x-user-email": email,
    "x-user-roles": "[]",
    "x-user-permissions": "[]",
  };
}

async function call(base, method, url, headers, body) {
  const res = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
}

module.exports = { app, start, gatewayHeaders, call, fakes, warnings, orig, pdpCalls };
