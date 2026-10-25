"use strict";
// scripts/lib/migrationTargetGuard.js: migrations run only against approved DEV databases.
const test = require("node:test");
const assert = require("node:assert");
const { assertMigrationTarget } = require("../scripts/lib/migrationTargetGuard");

test("DEV db passes; UAT db, mismatch, missing --expect-db on --apply are refused", () => {
  const orig = console.log; console.log = () => {};
  try {
    assert.equal(assertMigrationTarget("portal-service-dev", []), "portal-service-dev");
    assert.equal(assertMigrationTarget("portal-service-dev", ["--apply", "--expect-db=portal-service-dev"]), "portal-service-dev");
    assert.throws(() => assertMigrationTarget("Portal-Service", []), /not a DEV database/);
    assert.throws(() => assertMigrationTarget("portal-service-dev", ["--apply"]), /requires --expect-db/);
    assert.throws(() => assertMigrationTarget("portal-service-dev", ["--expect-db=Portal-Service"]), /--expect-db/);
    assert.throws(() => assertMigrationTarget("portal-service-dev", ["--target-env=uat"]), /requires DEPLOYMENT_ENV=uat/);
  } finally { console.log = orig; }
});
