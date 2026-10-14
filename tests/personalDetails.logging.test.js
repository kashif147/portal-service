"use strict";
// Personal-details controller logging: ids, outcomes and error names/codes/field names only.
// Request headers (Authorization, cookies), bodies, validated data, personal-details records and
// whole error objects never reach the logs. Responses are unchanged: every response assertion
// here also holds for the previous controller.
//
// The real controller, response middleware and Joi schemas are used; only the service, handler
// and (for the success paths) schema validation methods are replaced on their module objects.
const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const controller = require("../controllers/personal.details.controller");
const personalDetailsService = require("../services/personal.details.service");
const personalDetailsHandler = require("../handlers/personal.details.handler");
const joischemas = require("../validation/index.js");
const responseMw = require("../middlewares/response.mw");

const TENANT_ID = "68cbf7806080b4621d469d34";
const USER_ID = "6ab3fbeb327c7b49baf116fa";
const APPLICATION_ID = "app-0001";
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWNyZXQtc3ViamVjdCJ9.SECRET-JWT-SIGNATURE-0123";
const SENSITIVE = {
  email: "secret.person@example.org",
  forename: "Secretforename",
  surname: "Secretsurname",
  dateOfBirth: "1987-03-21",
  addressLine1: "12 Secret Street",
  eircode: "D02 SE99",
  mobile: "+353 87 765 4321",
  cookie: "connect.sid=SECRET-COOKIE-0123",
};
const SECRET_VALUES = [JWT, "SECRET-JWT-SIGNATURE", ...Object.values(SENSITIVE), "SECRET-"];
// Plain objects as JSON (for the field assertions); Error objects as the console prints them
// (message and stack included), so a logged error object is caught.
const render = (a) =>
  typeof a === "string" ? a : a instanceof Error ? require("util").inspect(a) : JSON.stringify(a);

const body = () => ({
  personalInfo: { forename: SENSITIVE.forename, surname: SENSITIVE.surname, dateOfBirth: SENSITIVE.dateOfBirth },
  contactInfo: {
    personalEmail: SENSITIVE.email,
    mobileNumber: SENSITIVE.mobile,
    buildingOrHouse: SENSITIVE.addressLine1,
    eircode: SENSITIVE.eircode,
  },
});
const record = () => ({ _id: "pd-1", applicationId: APPLICATION_ID, tenantId: TENANT_ID, userId: USER_ID, ...body() });

// The authenticated context carries internal ids only, so the shared get.user.info helper (which
// logs req.user, outside this change) cannot put the sensitive values into the logs.
const request = (extra = {}) => ({
  method: "POST",
  url: "/api/personal-details",
  headers: { authorization: `Bearer ${JWT}`, cookie: SENSITIVE.cookie, "content-type": "application/json" },
  user: { id: USER_ID, userType: "PORTAL" },
  ctx: { tenantId: TENANT_ID, userId: USER_ID },
  params: {},
  body: body(),
  ...extra,
});

async function run(action, req) {
  const res = {};
  res.statusCode = 200;
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  responseMw(req, res, () => {});
  let nextArg;
  await controller[action](req, res, (e) => {
    nextArg = e;
  });
  return {
    status: res.body === undefined ? null : res.statusCode,
    body: res.body === undefined ? null : JSON.parse(JSON.stringify(res.body)),
    next: nextArg ? { status: nextArg.status ?? null, message: nextArg.message } : null,
  };
}

const captured = [];
const restore = [];
function patch(obj, key, value) {
  const original = obj[key];
  obj[key] = value;
  restore.push(() => {
    obj[key] = original;
  });
}
test.beforeEach(() => {
  captured.length = 0;
  for (const level of ["log", "error", "warn", "info"]) {
    patch(console, level, (...args) =>
      captured.push(args.map(render).join(" ")),
    );
  }
});
test.afterEach(() => {
  while (restore.length) restore.pop()();
});
const logs = () => captured.join("\n");
const assertNoSensitiveLogs = () => {
  const text = logs();
  for (const value of SECRET_VALUES) assert.ok(!text.includes(value), `log contains sensitive value ${value.slice(0, 6)}...`);
  assert.doesNotMatch(text, /authorization|Bearer|cookie|keyValue|Request (body|headers)/i);
};

// --- create: success / Joi / Mongoose / duplicate key / service error -------------------------

function stubCreatePath() {
  patch(personalDetailsHandler, "getActiveByUserIdForPortal", async () => null);
  patch(joischemas.personal_details_create, "validateAsync", async (b) => b);
}

test("create success: response unchanged", async () => {
  stubCreatePath();
  patch(personalDetailsService, "createPersonalDetails", async () => record());
  const r = await run("createPersonalDetails", request());
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "success");
  assert.equal(r.body.data.applicationId, APPLICATION_ID);
  assert.equal(r.body.data.contactInfo.personalEmail, SENSITIVE.email);
  assert.equal(r.body.data.personalInfo.fullName, `${SENSITIVE.forename} ${SENSITIVE.surname}`);
});

test("create success: no headers, body, validated data or record in logs; ids and outcome are", async () => {
  stubCreatePath();
  patch(personalDetailsService, "createPersonalDetails", async () => record());
  await run("createPersonalDetails", request());
  assertNoSensitiveLogs();
  assert.match(logs(), new RegExp(`Extracted context:.*"tenantId":"${TENANT_ID}".*"userId":"${USER_ID}".*"userType":"PORTAL"`));
  assert.match(logs(), new RegExp(`createPersonalDetails SUCCESS.*"applicationId":"${APPLICATION_ID}"`));
});

test("create Joi validation error: response unchanged", async () => {
  patch(personalDetailsHandler, "getActiveByUserIdForPortal", async () => null);
  const req = request({ body: { ...body(), unexpectedSecretField: SENSITIVE.email } });
  const r = await run("createPersonalDetails", req);
  assert.equal(r.next.status, 400);
  assert.match(r.next.message, /^Validation error: /);
});

test("create Joi validation error: logs field paths only", async () => {
  patch(personalDetailsHandler, "getActiveByUserIdForPortal", async () => null);
  await run("createPersonalDetails", request({ body: { ...body(), unexpectedSecretField: SENSITIVE.email } }));
  assertNoSensitiveLogs();
  assert.match(logs(), /\[createPersonalDetails\] Error:.*"name":"ValidationError".*"fields":\[[^\]]*"/);
});

const mongooseValidationError = () => {
  const err = new mongoose.Error.ValidationError();
  err.addError(
    "personalInfo.dateOfBirth",
    new mongoose.Error.CastError("Date", SENSITIVE.dateOfBirth + "x", "personalInfo.dateOfBirth"),
  );
  err.addError(
    "contactInfo.personalEmail",
    new mongoose.Error.ValidatorError({ message: `bad email ${SENSITIVE.email}`, path: "contactInfo.personalEmail", value: SENSITIVE.email }),
  );
  return err;
};

test("create Mongoose validation error: response unchanged", async () => {
  stubCreatePath();
  patch(personalDetailsService, "createPersonalDetails", async () => {
    throw mongooseValidationError();
  });
  const r = await run("createPersonalDetails", request());
  assert.equal(r.next.status, 400);
  assert.equal(r.next.message, "Data validation error: " + mongooseValidationError().message);
});

test("create Mongoose validation error: logs Object.keys(errors) only", async () => {
  stubCreatePath();
  patch(personalDetailsService, "createPersonalDetails", async () => {
    throw mongooseValidationError();
  });
  await run("createPersonalDetails", request());
  assertNoSensitiveLogs();
  assert.match(logs(), /"fields":\["personalInfo\.dateOfBirth","contactInfo\.personalEmail"\]/);
});

const duplicateKeyError = () =>
  Object.assign(new Error(`E11000 duplicate key error collection: personaldetails dup key: { contactInfo.personalEmail: "${SENSITIVE.email}" }`), {
    name: "MongoServerError",
    code: 11000,
    keyPattern: { tenantId: 1, "contactInfo.personalEmail": 1 },
    keyValue: { tenantId: TENANT_ID, "contactInfo.personalEmail": SENSITIVE.email },
  });

test("create duplicate key: response unchanged", async () => {
  stubCreatePath();
  patch(personalDetailsService, "createPersonalDetails", async () => {
    throw duplicateKeyError();
  });
  const r = await run("createPersonalDetails", request());
  assert.deepEqual(r.next, { status: 409, message: "Personal details already exist for this user" });
});

test("create duplicate key: logs Object.keys(keyPattern) only, never keyValue", async () => {
  stubCreatePath();
  patch(personalDetailsService, "createPersonalDetails", async () => {
    throw duplicateKeyError();
  });
  await run("createPersonalDetails", request());
  assertNoSensitiveLogs();
  assert.match(logs(), /"code":11000,"fields":\["tenantId","contactInfo\.personalEmail"\]/);
});

const serviceError = () => Object.assign(new Error(`lookup failed for ${SENSITIVE.email}`), { code: "SVC_DOWN" });

test("create service error: passed on unchanged; logs name and code only", async () => {
  stubCreatePath();
  const err = serviceError();
  patch(personalDetailsService, "createPersonalDetails", async () => {
    throw err;
  });
  const r = await run("createPersonalDetails", request());
  assert.deepEqual(r.next, { status: null, message: err.message });
  assertNoSensitiveLogs();
  assert.match(logs(), /\[createPersonalDetails\] Error:.*"name":"Error","code":"SVC_DOWN"/);
});

// --- getMyPersonalDetails (called on every portal login) ----------------------------------------

test("getMyPersonalDetails found: response unchanged; no headers, user, ctx or record in logs", async () => {
  patch(personalDetailsService, "getMyPersonalDetails", async () => record());
  const r = await run("getMyPersonalDetails", request({ method: "GET", body: {} }));
  assert.equal(r.status, 200);
  assert.equal(r.body.data.contactInfo.personalEmail, SENSITIVE.email);
  assertNoSensitiveLogs();
  assert.match(logs(), /Service response: \{"found":true\}/);
  assert.match(logs(), new RegExp(`Extracted context:.*"tenantId":"${TENANT_ID}".*"userId":"${USER_ID}"`));
});

test("getMyPersonalDetails not found: response unchanged", async () => {
  patch(personalDetailsService, "getMyPersonalDetails", async () => null);
  const r = await run("getMyPersonalDetails", request({ method: "GET", body: {} }));
  assert.deepEqual(r.body, { success: true, data: null, message: "Personal details not found" });
  assertNoSensitiveLogs();
  assert.match(logs(), /Service response: \{"found":false\}/);
});

test("getMyPersonalDetails service error: passed on unchanged; no error object in logs", async () => {
  const err = serviceError();
  patch(personalDetailsService, "getMyPersonalDetails", async () => {
    throw err;
  });
  const r = await run("getMyPersonalDetails", request({ method: "GET", body: {} }));
  assert.deepEqual(r.next, { status: null, message: err.message });
  assertNoSensitiveLogs();
  assert.match(logs(), new RegExp(`\\[getMyPersonalDetails\\] Error:.*"tenantId":"${TENANT_ID}".*"code":"SVC_DOWN"`));
});

test("getMyPersonalDetails without a userId: response unchanged; req.user is not dumped", async () => {
  const r = await run("getMyPersonalDetails", request({ method: "GET", body: {}, user: { userType: "PORTAL" } }));
  assert.equal(r.next.status, 400);
  assertNoSensitiveLogs();
  // The controller's own req.user dumps ("req.user object:", req.user.id / ._id) are gone.
  assert.doesNotMatch(logs(), /req\.user object|req\.user\.(id|_id):/);
});

// --- get / update / delete / status error paths -------------------------------------------------

for (const [action, method] of [
  ["getPersonalDetails", "getPersonalDetails"],
  ["updatePersonalDetails", "updatePersonalDetails"],
  ["deletePersonalDetails", "deletePersonalDetails"],
  ["getApplicationStatus", "getApplicationStatus"],
]) {
  test(`${action} service error: passed on unchanged; logs name and code only`, async () => {
    if (action === "updatePersonalDetails") patch(joischemas.personal_details_update, "validateAsync", async (b) => b);
    const err = serviceError();
    patch(personalDetailsService, method, async () => {
      throw err;
    });
    const r = await run(action, request({ params: { applicationId: APPLICATION_ID } }));
    assert.deepEqual(r.next, { status: null, message: err.message });
    assertNoSensitiveLogs();
    assert.match(logs(), new RegExp(`\\[${action}\\] Error:.*"name":"Error","code":"SVC_DOWN"`));
  });
}

test("updatePersonalDetails Joi error: response unchanged; field paths only", async () => {
  const r = await run(
    "updatePersonalDetails",
    request({ params: { applicationId: APPLICATION_ID }, body: { ...body(), unexpectedSecretField: SENSITIVE.email } }),
  );
  assert.equal(r.next.status, 400);
  assert.match(r.next.message, /^Validation error: /);
  assertNoSensitiveLogs();
});
