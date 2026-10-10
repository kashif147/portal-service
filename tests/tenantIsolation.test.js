"use strict";
// Tenant A/B isolation for portal-service (Phase 2B Stream 3A: C-13, H-19,
// D-01/D-02/D-03/D-21). Drives the REAL app over HTTP with in-memory model
// fakes (no DB, no RabbitMQ, PDP bypassed — authenticate is NOT bypassed).
// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const { start, gatewayHeaders, call, fakes } = require("./helpers/appHarness");
const { seed, store, reset } = fakes;

const TENANT_A = "68cbf7806080b4621d469d34";
const TENANT_B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const oid = () => new mongoose.Types.ObjectId().toString();

const CRM_A = { tenantId: TENANT_A, userId: oid(), userType: "CRM" };
const CRM_B = { tenantId: TENANT_B, userId: oid(), userType: "CRM" };
const PORTAL_U1 = { tenantId: TENANT_A, userId: oid(), userType: "PORTAL" };
const PORTAL_U2 = { tenantId: TENANT_A, userId: oid(), userType: "PORTAL" };

let server;
let base;
let A1; // tenant A, portal user U1
let A_CRM; // tenant A, CRM-created (userId null)
let B1; // tenant B

function seedWorld() {
  reset();
  A1 = seed("personal", {
    tenantId: TENANT_A,
    applicationId: "app-A1",
    userId: PORTAL_U1.userId,
    applicationStatus: "in-progress",
    personalInfo: { forename: "Alice", surname: "A" },
    contactInfo: { personalEmail: "alice@a.test" },
    meta: { userType: "PORTAL", deleted: false, isActive: true },
  });
  A_CRM = seed("personal", {
    tenantId: TENANT_A,
    applicationId: "app-A-crm",
    userId: null,
    applicationStatus: "in-progress",
    personalInfo: { forename: "Carl", surname: "Crm" },
    contactInfo: { personalEmail: "carl@a.test" },
    meta: { userType: "CRM", deleted: false, isActive: true },
  });
  B1 = seed("personal", {
    tenantId: TENANT_B,
    applicationId: "app-B1",
    userId: PORTAL_U1.userId, // same user id in another tenant (collision case)
    applicationStatus: "submitted",
    personalInfo: { forename: "Bob", surname: "B" },
    contactInfo: { personalEmail: "bob@b.test" },
    meta: { userType: "PORTAL", deleted: false, isActive: true },
  });
  for (const p of [A1, A_CRM, B1]) {
    seed("professional", {
      tenantId: p.tenantId,
      applicationId: p.applicationId,
      userId: p.userId,
      professionalDetails: { workLocation: `WL-${p.applicationId}` },
      meta: { userType: p.meta.userType, deleted: false, isActive: true },
    });
    seed("subscription", {
      tenantId: p.tenantId,
      applicationId: p.applicationId,
      userId: p.userId,
      subscriptionDetails: { paymentType: "Credit Card", membershipCategory: "General" },
      meta: { userType: p.meta.userType, deleted: false, isActive: true },
    });
  }
}

const row = (name, applicationId, tenantId) =>
  store[name].find((d) => d.applicationId === applicationId && d.tenantId === tenantId);

test.before(async () => {
  ({ server, base } = await start());
});
test.after(() => new Promise((r) => server.close(r)));
test.beforeEach(seedWorld);

// ---------------------------------------------------------------- auth mount
test("H-19: /api routes require authentication (authenticate is mounted)", async () => {
  const res = await call(base, "GET", "/api/applications", {});
  assert.ok([400, 401].includes(res.status), `got ${res.status}`);
  assert.equal(res.body?.data, undefined, "no data leaked without auth");
});

test("H-19: pre-auth routes stay public (/health)", async () => {
  const res = await call(base, "GET", "/health", {});
  assert.equal(res.status, 200);
});

test("H-19: invalid Bearer JWT is rejected without echoing the verifier error", async () => {
  const res = await call(base, "GET", "/api/applications", {
    authorization: "Bearer not-a-jwt",
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.jwtError, undefined);
  assert.equal(res.body.error.message, "Invalid token");
});

// ------------------------------------------------------------- CRM listing
test("C-13: CRM in tenant A lists only tenant A applications", async () => {
  const res = await call(base, "GET", "/api/applications", gatewayHeaders(CRM_A));
  assert.equal(res.status, 200);
  const ids = res.body.data.applications.map((a) => a.applicationId).sort();
  assert.deepEqual(ids, ["app-A-crm", "app-A1"]);
});

test("C-13: CRM in tenant B lists only tenant B applications", async () => {
  const res = await call(base, "GET", "/api/applications", gatewayHeaders(CRM_B));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.applications.map((a) => a.applicationId), ["app-B1"]);
});

test("C-13: query tenantId cannot widen the CRM list to another tenant", async () => {
  const res = await call(
    base,
    "GET",
    `/api/applications?tenantId=${TENANT_B}`,
    gatewayHeaders(CRM_A)
  );
  // Either rejected by Joi (unknown key) or ignored — never tenant B rows.
  if (res.status === 200) {
    const ids = res.body.data.applications.map((a) => a.applicationId);
    assert.ok(!ids.includes("app-B1"));
  } else {
    assert.equal(res.status, 400);
  }
});

// ------------------------------------------------- CRM cross-tenant by id
test("C-13: CRM in tenant B cannot read tenant A application by id", async () => {
  const h = gatewayHeaders(CRM_B);
  const app = await call(base, "GET", "/api/applications/app-A1", h);
  assert.equal(app.body?.data ?? null, null);
  for (const p of ["personal-details", "professional-details", "subscription-details"]) {
    const r = await call(base, "GET", `/api/${p}/app-A1`, h);
    assert.equal(r.body?.data ?? null, null, `${p} leaked tenant A data`);
  }
  const st = await call(base, "GET", "/api/personal-details/app-A1/status", h);
  assert.equal(st.body?.data ?? null, null);
});

test("C-13: CRM in tenant B cannot update tenant A application", async () => {
  const h = gatewayHeaders(CRM_B);
  await call(base, "PUT", "/api/personal-details/app-A1", h, {
    personalInfo: { forename: "HACKED" },
  });
  await call(base, "PUT", "/api/professional-details/app-A1", h, {
    professionalDetails: { workLocation: "HACKED" },
  });
  await call(base, "PUT", "/api/subscription-details/app-A1", h, {
    subscriptionDetails: { membershipCategory: "HACKED" },
  });
  assert.equal(row("personal", "app-A1", TENANT_A).personalInfo.forename, "Alice");
  assert.equal(row("professional", "app-A1", TENANT_A).professionalDetails.workLocation, "WL-app-A1");
  assert.equal(row("subscription", "app-A1", TENANT_A).subscriptionDetails.membershipCategory, "General");
  // and CRM-B's PUT on subscription did NOT create a stray row anywhere
  assert.equal(store.subscription.filter((d) => d.applicationId === "app-A1").length, 1);
});

test("C-13: CRM in tenant B cannot delete tenant A application", async () => {
  const h = gatewayHeaders(CRM_B);
  for (const p of ["personal-details", "professional-details", "subscription-details"]) {
    await call(base, "DELETE", `/api/${p}/app-A1`, h);
  }
  assert.ok(row("personal", "app-A1", TENANT_A));
  assert.ok(row("professional", "app-A1", TENANT_A));
  assert.ok(row("subscription", "app-A1", TENANT_A));
});

test("C-13 positive control: CRM in tenant A CAN update + delete its own application", async () => {
  const h = gatewayHeaders(CRM_A);
  const up = await call(base, "PUT", "/api/personal-details/app-A1", h, {
    personalInfo: { forename: "Alicia" },
  });
  assert.equal(up.status, 200);
  assert.equal(row("personal", "app-A1", TENANT_A).personalInfo.forename, "Alicia");
  const del = await call(base, "DELETE", "/api/professional-details/app-A1", h);
  assert.equal(del.status, 200);
  assert.equal(row("professional", "app-A1", TENANT_A), undefined);
});

// ----------------------------------------------------- portal ownership
test("portal user cannot read another user's application (same tenant)", async () => {
  const h = gatewayHeaders(PORTAL_U2);
  for (const p of ["personal-details", "subscription-details"]) {
    const r = await call(base, "GET", `/api/${p}/app-A1`, h);
    assert.equal(r.body?.data ?? null, null, `${p} leaked another user's application`);
  }
  const prof = await call(base, "GET", "/api/professional-details/app-A1", h);
  assert.notEqual(prof.status, 200);
});

test("portal user's 'my' endpoints are tenant-scoped (same userId in tenant B not returned)", async () => {
  const res = await call(base, "GET", "/api/personal-details", gatewayHeaders(PORTAL_U1));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.applicationId, "app-A1");
  const sub = await call(base, "GET", "/api/subscription-details", gatewayHeaders(PORTAL_U1));
  assert.equal(sub.body.data.applicationId, "app-A1");
  const prof = await call(base, "GET", "/api/professional-details", gatewayHeaders(PORTAL_U1));
  assert.equal(prof.body.data.applicationId, "app-A1");
});

test("D-21: non-CRM caller with null userId cannot reach CRM-created (userId:null) application", async () => {
  // userType not PORTAL/CRM -> extractUserAndCreatorContext yields userId null.
  const h = gatewayHeaders({ tenantId: TENANT_A, userId: oid(), userType: "user" });
  for (const p of ["personal-details", "professional-details", "subscription-details"]) {
    const r = await call(base, "GET", `/api/${p}/app-A-crm`, h);
    assert.equal(r.status, 403, `${p} GET should deny null userId (got ${r.status})`);
  }
  const put = await call(base, "PUT", "/api/personal-details/app-A-crm", h, {
    personalInfo: { forename: "HACKED" },
  });
  assert.equal(put.status, 403);
  const del = await call(base, "DELETE", "/api/personal-details/app-A-crm", h);
  assert.equal(del.status, 403);
  assert.equal(row("personal", "app-A-crm", TENANT_A).personalInfo.forename, "Carl");
});

// ----------------------------------------------- trusted tenant on create
test("body tenantId is ignored: create stamps the trusted tenant", async () => {
  const body = {
    personalInfo: {
      title: "Ms",
      surname: "New",
      forename: "Nina",
      gender: "F",
      dateOfBirth: "1990-01-01",
      countryPrimaryQualification: "IE",
    },
    contactInfo: {
      buildingOrHouse: "1",
      countyCityOrPostCode: "Dublin",
      country: "IE",
      personalEmail: "nina@a.test",
      preferredAddress: "home",
      preferredEmail: "personal",
    },
  };
  const userNew = { tenantId: TENANT_A, userId: oid(), userType: "PORTAL" };
  const withTenant = await call(base, "POST", "/api/personal-details", gatewayHeaders(userNew), {
    ...body,
    tenantId: TENANT_B,
  });
  // Joi rejects the unknown key -> nothing written to tenant B.
  assert.ok(!store.personal.some((d) => d.tenantId === TENANT_B && d.personalInfo?.forename === "Nina"));
  if (withTenant.status === 200) {
    assert.equal(withTenant.body.data.tenantId, TENANT_A);
  }
  const ok = await call(base, "POST", "/api/personal-details", gatewayHeaders(userNew), body);
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.data.tenantId, TENANT_A);
  const created = store.personal.find((d) => d.personalInfo?.forename === "Nina");
  assert.equal(created.tenantId, TENANT_A);
});

test("handler create overrides a tenantId smuggled in the data with the trusted tenant", async () => {
  const handler = require("../handlers/subscription.details.handler");
  const created = await handler.create(TENANT_A, {
    tenantId: TENANT_B,
    applicationId: "app-new",
    subscriptionDetails: { paymentType: "Credit Card" },
  });
  assert.equal(created.tenantId, TENANT_A);
});

test("handlers refuse to run without a tenant (no unscoped fallback)", async () => {
  const handlers = [
    require("../handlers/personal.details.handler"),
    require("../handlers/professional.details.handler"),
    require("../handlers/subscription.details.handler"),
  ];
  for (const h of handlers) {
    await assert.rejects(() => h.getApplicationById(undefined, "app-A1"), /Tenant context required/);
    await assert.rejects(() => h.updateByApplicationId(null, "app-A1", {}), /Tenant context required/);
  }
  const app = require("../handlers/application.handler");
  await assert.rejects(() => app.getAllApplicationsWithDetails(undefined, []), /Tenant context required/);
});

test("tenant duplicate check is tenant-scoped (email in tenant B does not block tenant A CRM create)", async () => {
  const handler = require("../handlers/personal.details.handler");
  assert.equal(await handler.getByEmail(TENANT_A, "bob@b.test"), null);
  assert.ok(await handler.getByEmail(TENANT_B, "bob@b.test"));
});

test("every tenant-owned query issued during a CRM request carries tenantId", async () => {
  fakes.calls.length = 0;
  await call(base, "GET", "/api/applications", gatewayHeaders(CRM_A));
  await call(base, "GET", "/api/applications/app-A1", gatewayHeaders(CRM_A));
  await call(base, "PUT", "/api/subscription-details/app-A1", gatewayHeaders(CRM_A), {
    subscriptionDetails: { membershipCategory: "Student" },
  });
  const unscoped = fakes.calls.filter((c) => c.op !== "create" && !c.query?.tenantId);
  assert.deepEqual(unscoped, []);
  assert.ok(fakes.calls.length > 0);
});
