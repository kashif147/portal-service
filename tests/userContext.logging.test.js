"use strict";
// helpers/get.user.info.js and services/personal.details.service.js log internal identifiers and
// error names/codes/field names only - never the req.user object (email, names, roles,
// permissions, token data), error messages that embed values, keyValue or whole error objects.
// Return values and rethrown errors are unchanged.
const test = require("node:test");
const assert = require("node:assert");
const util = require("util");
const mongoose = require("mongoose");

const { extractUserAndCreatorContext } = require("../helpers/get.user.info.js");
const personalDetailsService = require("../services/personal.details.service");
const personalDetailsHandler = require("../handlers/personal.details.handler");

const TENANT_ID = "68cbf7806080b4621d469d34";
const USER_ID = "6ab3fbeb327c7b49baf116fa";
const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWNyZXQifQ.SECRET-JWT-SIGNATURE";
const SENSITIVE = {
  email: "secret.person@example.org",
  forename: "Secretforename",
  surname: "Secretsurname",
  fullName: "Secretforename Secretsurname",
  mobile: "+353 87 765 4321",
  dateOfBirth: "1987-03-21",
  eircode: "D02 SE99",
  role: "SECRET-ROLE-CODE",
  permission: "secretresource:secretaction",
};
const SECRET_VALUES = [JWT, "SECRET-", ...Object.values(SENSITIVE)];

const render = (a) => (typeof a === "string" ? a : a instanceof Error ? util.inspect(a) : JSON.stringify(a));
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
  for (const level of ["log", "error", "warn", "info"]) patch(console, level, (...a) => captured.push(a.map(render).join(" ")));
});
test.afterEach(() => {
  while (restore.length) restore.pop()();
});
const logs = () => captured.join("\n");
const assertNoSensitiveLogs = () => {
  const text = logs();
  for (const v of SECRET_VALUES) assert.ok(!text.includes(v), `log contains sensitive value ${v.slice(0, 6)}...`);
  // Field names such as contactInfo.personalEmail are allowed; objects and values are not.
  assert.doesNotMatch(text, /req\.user|"permissions"|"roles"|"email"|keyValue/i);
};

const portalUser = () => ({
  id: USER_ID,
  userType: "PORTAL",
  tenantId: TENANT_ID,
  email: SENSITIVE.email,
  firstName: SENSITIVE.forename,
  lastName: SENSITIVE.surname,
  fullName: SENSITIVE.fullName,
  mobile: SENSITIVE.mobile,
  roles: [SENSITIVE.role],
  permissions: [SENSITIVE.permission],
  token: JWT,
});

// --- helpers/get.user.info.js --------------------------------------------------------------------

test("portal user: return value unchanged", () => {
  const ctx = extractUserAndCreatorContext({ user: portalUser(), ctx: { tenantId: TENANT_ID } });
  assert.deepEqual(ctx, { userType: "PORTAL", userId: USER_ID, creatorId: USER_ID });
});

test("portal user: logs userId, tenantId and userType only - not the req.user object", () => {
  extractUserAndCreatorContext({ user: portalUser(), ctx: { tenantId: TENANT_ID } });
  assertNoSensitiveLogs();
  assert.match(logs(), new RegExp(`User context: \\{"userId":"${USER_ID}","tenantId":"${TENANT_ID}","userType":"PORTAL"\\}`));
});

test("CRM user: return value unchanged (userId null); nothing sensitive logged", () => {
  const user = { ...portalUser(), _id: "6ace0cca930516adb01cbe4d", id: undefined, userType: "CRM" };
  const ctx = extractUserAndCreatorContext({ user, tenantId: TENANT_ID });
  assert.deepEqual(ctx, { userType: "CRM", userId: null, creatorId: "6ace0cca930516adb01cbe4d" });
  assertNoSensitiveLogs();
  assert.match(logs(), new RegExp(`User context: \\{"userId":null,"tenantId":"${TENANT_ID}","userType":"CRM"\\}`));
});

// --- services/personal.details.service.js ------------------------------------------------------

const mongooseValidationError = () => {
  const err = new mongoose.Error.ValidationError();
  err.addError(
    "contactInfo.personalEmail",
    new mongoose.Error.ValidatorError({ message: `bad email ${SENSITIVE.email}`, path: "contactInfo.personalEmail", value: SENSITIVE.email }),
  );
  err.addError("personalInfo.dateOfBirth", new mongoose.Error.CastError("Date", SENSITIVE.dateOfBirth + "x", "personalInfo.dateOfBirth"));
  return err;
};
const duplicateKeyError = () =>
  Object.assign(new Error(`E11000 duplicate key error dup key: { contactInfo.personalEmail: "${SENSITIVE.email}" }`), {
    name: "MongoServerError",
    code: 11000,
    keyPattern: { tenantId: 1, "contactInfo.personalEmail": 1 },
    keyValue: { tenantId: TENANT_ID, "contactInfo.personalEmail": SENSITIVE.email },
  });

// Each service method, the handler call it makes, and its arguments.
const CASES = [
  ["createPersonalDetails", ["create"], [TENANT_ID, { contactInfo: { personalEmail: SENSITIVE.email } }]],
  ["getPersonalDetails", ["getByUserIdAndApplicationId"], [TENANT_ID, "app-1", USER_ID, "PORTAL"]],
  ["updatePersonalDetails", ["getByUserIdAndApplicationId"], [TENANT_ID, "app-1", { a: 1 }, USER_ID, "PORTAL"]],
  ["deletePersonalDetails", ["deleteByUserIdAndApplicationId"], [TENANT_ID, "app-1", USER_ID, "PORTAL"]],
  ["getMyPersonalDetails", ["getByUserIdForPortal"], [TENANT_ID, USER_ID]],
  ["checkPersonalDetailsExist", ["getByUserId"], [TENANT_ID, USER_ID]],
  ["getApplicationStatus", ["getByUserIdAndApplicationId"], [TENANT_ID, "app-1", USER_ID, "PORTAL"]],
];

for (const [method, handlerFns, args] of CASES) {
  for (const [label, makeError, expectedFields] of [
    ["duplicate key", duplicateKeyError, `"code":11000,"fields":["tenantId","contactInfo.personalEmail"]`],
    ["Mongoose validation", mongooseValidationError, `"fields":["contactInfo.personalEmail","personalInfo.dateOfBirth"]`],
  ]) {
    test(`service ${method} ${label} error: rethrown unchanged; field names only in logs`, async () => {
      const err = makeError();
      for (const fn of handlerFns) patch(personalDetailsHandler, fn, async () => {
        throw err;
      });
      await assert.rejects(() => personalDetailsService[method](...args), (thrown) => thrown === err);
      assertNoSensitiveLogs();
      assert.ok(logs().includes(`PersonalDetailsService [${method}] Error:`), "error line present");
      assert.ok(logs().includes(expectedFields), `expected ${expectedFields}`);
    });
  }
}
