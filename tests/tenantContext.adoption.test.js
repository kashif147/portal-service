"use strict";
// Phase 1A/2B adoption — portal-service authenticate + tenant-context guard (WARN MODE).
// Mirrors events-service/issue-service tests/tenantContext.adoption.node.js.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { start, gatewayHeaders, call } = require("./helpers/appHarness");
const { tenantContextWarn } = require("../middlewares/tenantContext.mw.js");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
const appSrc = () => read("app.js");
const TRUSTED = "68cbf7806080b4621d469d34";
const OTHER = "aaaaaaaaaaaaaaaaaaaaaaaa";

test("tenantContextWarn exists and is warn mode only", () => {
  assert.equal(typeof tenantContextWarn, "function");
  const src = read("middlewares/tenantContext.mw.js");
  assert.match(src, /tenantContextMiddleware\(\{\s*mode:\s*"warn"\s*\}\)/);
  assert.ok(!/mode:\s*"enforce"/.test(src));
});

test("global ordering: authenticate -> tenantContextWarn -> /api routes", () => {
  assert.match(
    appSrc(),
    /app\.use\(authenticate\);\s*\n\s*app\.use\(tenantContextWarn\);\s*\n\s*app\.use\("\/api",\s*require\("\.\/routes\/index"\)\)/
  );
  assert.equal((appSrc().match(/app\.use\(tenantContextWarn\)/g) || []).length, 1);
  assert.equal((appSrc().match(/app\.use\(authenticate\)/g) || []).length, 1);
});

test("pre-auth routes (/health, /auth, /api docs) are mounted before authenticate", () => {
  const src = appSrc();
  const authAt = src.indexOf("app.use(authenticate)");
  for (const marker of ['app.get("/health"', 'app.use("/auth"', 'app.get("/api"']) {
    const at = src.indexOf(marker);
    assert.ok(at > 0 && at < authAt, `${marker} must precede authenticate`);
  }
});

test("guard re-pins req.tenantId to the trusted tenant and never blocks a mismatch", () => {
  const req = {
    method: "POST",
    url: "/api/personal-details",
    originalUrl: "/api/personal-details",
    headers: { "x-jwt-verified": "true", "x-tenant-id": TRUSTED },
    ctx: { tenantId: TRUSTED },
    tenantId: OTHER,
    body: { tenantId: OTHER },
  };
  const res = { status() { throw new Error("must not respond"); } };
  let nexted = 0;
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = () => true;
  try {
    tenantContextWarn(req, res, () => (nexted += 1));
  } finally {
    process.stdout.write = orig;
  }
  assert.equal(nexted, 1);
  assert.equal(req.tenantId, TRUSTED);
  assert.equal(req.ctx.tenantId, TRUSTED);
});

test("gateway request missing x-tenant-id is rejected by authenticate before any handler", async () => {
  const { server, base } = await start();
  try {
    const h = gatewayHeaders({ tenantId: "", userId: "u1", userType: "CRM" });
    delete h["x-tenant-id"];
    const res = await call(base, "GET", "/api/applications", h);
    assert.ok([400, 401].includes(res.status), `got ${res.status}`);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
