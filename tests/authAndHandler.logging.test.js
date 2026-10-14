"use strict";
// middlewares/auth.js never logs the bearer token or any part of it (nor the Authorization
// value); handlers/personal.details.handler.js logs error {name, code, fields} only - never whole
// errors, messages that embed values, keyValue or rejected Joi/Mongoose values. Authentication
// results, resolved values and rejected errors are unchanged.
const test = require("node:test");
const assert = require("node:assert");
const util = require("util");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");

const { authenticate } = require("../middlewares/auth");
const handler = require("../handlers/personal.details.handler");
const PersonalDetails = require("../models/personal.details.model");

const TENANT_ID = "68cbf7806080b4621d469d34";
const USER_ID = "6ab3fbeb327c7b49baf116fa";
const SECRET = "test-only-jwt-secret-for-logging-tests";
const EMAIL = "secret.person@example.org";
const SENSITIVE = [EMAIL, "Secretforename", "Secretsurname", "1987-03-21", "+353 87 765 4321", "12 Secret Street", "D02 SE99"];

const render = (a) => (typeof a === "string" ? a : a instanceof Error ? util.inspect(a) : JSON.stringify(a));
const captured = [];
const restore = [];
function patch(obj, key, value) {
  const had = Object.prototype.hasOwnProperty.call(obj, key);
  const original = obj[key];
  obj[key] = value;
  restore.push(() => {
    if (had) obj[key] = original;
    else delete obj[key];
  });
}
test.beforeEach(() => {
  captured.length = 0;
  for (const level of ["log", "error", "warn", "info"]) patch(console, level, (...a) => captured.push(a.map(render).join(" ")));
  patch(process.env, "JWT_SECRET", SECRET);
});
test.afterEach(() => {
  while (restore.length) restore.pop()();
});
const logs = () => captured.join("\n");

// --- A. auth middleware ------------------------------------------------------------------------

const signToken = (claims = {}) =>
  jwt.sign({ sub: USER_ID, id: USER_ID, tenantId: TENANT_ID, userType: "PORTAL", email: EMAIL, roles: ["MEMBER"], ...claims }, SECRET);

function tokenParts(token) {
  const [h, p, s] = token.split(".");
  // The whole token, the 20-char prefix the old code logged, each segment and short windows of it.
  return [token, token.slice(0, 20), h, p, s, h.slice(0, 12), p.slice(0, 12), s.slice(0, 12), `Bearer ${token}`];
}
const assertTokenNotLogged = (token) => {
  const text = logs();
  for (const part of tokenParts(token)) assert.ok(!text.includes(part), `log contains token part ${part.slice(0, 4)}...`);
  // Header names (auth.js logs Object.keys(req.headers)) and the "Auth path: bearer" marker are
  // allowed; an Authorization value, "Bearer <token>" or any JWT segment is not.
  assert.doesNotMatch(text, /eyJ/);
  assert.doesNotMatch(text, /Bearer [A-Za-z0-9]/); // case-sensitive: the "bearer" path marker is fine
  assert.doesNotMatch(text, /authorization['"]?[ \t]*:[ \t]*['"]/i);
  assert.ok(!text.includes(EMAIL), "log contains the email claim");
};

async function runAuth(headers) {
  const req = { headers, method: "GET", url: "/api/personal-details" };
  const res = {};
  res.status = (s) => ((res.statusCode = s), res);
  res.json = (b) => ((res.body = b), res);
  let nextCalled = false;
  await authenticate(req, res, () => {
    nextCalled = true;
  });
  return { req, res, nextCalled };
}

test("auth: valid bearer token - behaviour unchanged (next, req.ctx, req.user)", async () => {
  const token = signToken();
  const { req, res, nextCalled } = await runAuth({ authorization: `Bearer ${token}` });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, undefined);
  assert.deepEqual(req.ctx, { tenantId: TENANT_ID, userId: USER_ID, roles: ["MEMBER"], permissions: [] });
  assert.equal(req.user.email, EMAIL);
  assert.equal(req.userId, USER_ID);
  assert.equal(req.tenantId, TENANT_ID);
});

test("auth: valid bearer token - no part of the token, Authorization value or email logged", async () => {
  const token = signToken();
  await runAuth({ authorization: `Bearer ${token}` });
  assertTokenNotLogged(token);
  assert.match(logs(), new RegExp(`Request context set: \\{"userId":"${USER_ID}","tenantId":"${TENANT_ID}","userType":"PORTAL"\\}`));
});

test("auth: bad signature - same 400 response; token not logged", async () => {
  const token = jwt.sign({ sub: USER_ID, tenantId: TENANT_ID, email: EMAIL }, "some-other-secret");
  const { res, nextCalled } = await runAuth({ authorization: `Bearer ${token}` });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: { message: "Invalid token", code: "BAD_REQUEST", status: 400, tokenError: true } });
  assertTokenNotLogged(token);
});

test("auth: token without tenantId - same 400 response; token not logged", async () => {
  const token = jwt.sign({ sub: USER_ID, email: EMAIL }, SECRET);
  const { res, nextCalled } = await runAuth({ authorization: `Bearer ${token}` });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.message, "Invalid token: missing tenantId");
  assert.equal(res.body.error.missingTenantId, true);
  assertTokenNotLogged(token);
});

test("auth: missing Authorization header - same 400 response", async () => {
  const { res, nextCalled } = await runAuth({});
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.message, "Authorization header required");
  assert.equal(res.body.error.missingHeader, true);
});

// --- B. personal-details handler ---------------------------------------------------------------

const duplicateKeyError = () =>
  Object.assign(new Error(`E11000 duplicate key error dup key: { contactInfo.personalEmail: "${EMAIL}" }`), {
    name: "MongoServerError",
    code: 11000,
    keyPattern: { tenantId: 1, "contactInfo.personalEmail": 1 },
    keyValue: { tenantId: TENANT_ID, "contactInfo.personalEmail": EMAIL },
  });
const mongooseValidationError = () => {
  const err = new mongoose.Error.ValidationError();
  err.addError(
    "contactInfo.personalEmail",
    new mongoose.Error.ValidatorError({ message: `bad email ${EMAIL}`, path: "contactInfo.personalEmail", value: EMAIL }),
  );
  err.addError("personalInfo.dateOfBirth", new mongoose.Error.CastError("Date", "1987-03-21x", "personalInfo.dateOfBirth"));
  err.addError(
    "contactInfo.mobileNumber",
    new mongoose.Error.ValidatorError({ message: "bad mobile +353 87 765 4321", path: "contactInfo.mobileNumber", value: "+353 87 765 4321" }),
  );
  return err;
};
const joiError = () =>
  Joi.object({ contactInfo: Joi.object({ personalEmail: Joi.number() }), personalInfo: Joi.object({ forename: Joi.number() }) })
    .validate({ contactInfo: { personalEmail: EMAIL }, personalInfo: { forename: "Secretforename" } }, { abortEarly: false }).error;

const ERRORS = [
  ["duplicate key", duplicateKeyError, `"code":11000,"fields":["tenantId","contactInfo.personalEmail"]`],
  ["Mongoose validation", mongooseValidationError, `"fields":["contactInfo.personalEmail","personalInfo.dateOfBirth","contactInfo.mobileNumber"]`],
  ["Joi validation", joiError, `"fields":["contactInfo.personalEmail","personalInfo.forename"]`],
];

const data = () => ({
  personalInfo: { forename: "Secretforename", surname: "Secretsurname", dateOfBirth: "1987-03-21" },
  contactInfo: { personalEmail: EMAIL, mobileNumber: "+353 87 765 4321", buildingOrHouse: "12 Secret Street", eircode: "D02 SE99" },
});
// Every handler export that can fail, with arguments.
const CALLS = [
  ["create", [TENANT_ID, data()]],
  ["getByUserId", [TENANT_ID, USER_ID]],
  ["getByEmail", [TENANT_ID, EMAIL]],
  ["getApplicationById", [TENANT_ID, "app-1"]],
  ["getByUserIdAndApplicationId", [TENANT_ID, USER_ID, "app-1"]],
  ["updateByApplicationId", [TENANT_ID, "app-1", data()]],
  ["updateByUserIdAndApplicationId", [TENANT_ID, USER_ID, "app-1", data()]],
  ["deleteByApplicationId", [TENANT_ID, "app-1"]],
  ["deleteByUserIdAndApplicationId", [TENANT_ID, USER_ID, "app-1"]],
  ["updateApplicationStatus", [TENANT_ID, "app-1", "submitted"]],
  ["getByUserIdForPortal", [TENANT_ID, USER_ID]],
  ["getActiveByUserIdForPortal", [TENANT_ID, USER_ID]],
];
// A rejected query that still supports the chained calls the handler makes (.sort, .lean, ...).
const rejectingQuery = (err) => {
  const q = {
    then: (ok, fail) => Promise.reject(err).then(ok, fail),
    catch: (fail) => Promise.reject(err).catch(fail),
  };
  for (const m of ["sort", "lean", "select", "exec", "populate"]) q[m] = () => q;
  return q;
};
const failModel = (err) => {
  for (const fn of ["create", "findOne", "findOneAndUpdate", "findOneAndDelete"]) {
    patch(PersonalDetails, fn, () => rejectingQuery(err));
  }
};

for (const [label, makeError, expectedFields] of ERRORS) {
  for (const [fn, args] of CALLS) {
    test(`handler ${fn} ${label} error: rejected with the same error; field names only in logs`, async () => {
      const err = makeError();
      failModel(err);
      await assert.rejects(() => handler[fn](...structuredClone(args)), (thrown) => thrown === err);
      const text = logs();
      for (const v of SENSITIVE) assert.ok(!text.includes(v), `log contains ${v.slice(0, 5)}...`);
      assert.doesNotMatch(text, /keyValue|E11000|ValidatorError|"value"/);
      assert.ok(text.includes(`PersonalDetailsHandler [${fn}] Error:`), "error line present");
      assert.ok(text.includes(expectedFields), `expected ${expectedFields} in ${text}`);
    });
  }
}

test("handler getByEmail success: resolves the same record", async () => {
  const record = { applicationId: "app-1", contactInfo: { personalEmail: EMAIL } };
  patch(PersonalDetails, "findOne", async () => record);
  assert.equal(await handler.getByEmail(TENANT_ID, EMAIL), record);
  assert.ok(!logs().includes(EMAIL));
});
