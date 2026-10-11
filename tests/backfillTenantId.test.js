"use strict";
// scripts/migrations/backfill-tenantId.js phase 1 (child rows inherit the parent
// personalDetails tenant). Pure in-memory fake db; no Mongo.
const test = require("node:test");
const assert = require("node:assert");

const { propagateFromPersonal } = require("../scripts/migrations/backfill-tenantId");

const A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbbbbbbbbbb";

const isMissing = (r) => r.tenantId === undefined || r.tenantId === null || r.tenantId === "";

function fakeDb(data) {
  const updates = [];
  const collection = (name) => ({
    find: () => (async function* () {
      for (const r of data[name] || []) if (isMissing(r)) yield { _id: r._id, applicationId: r.applicationId };
    })(),
    distinct: async (field, q) => [
      ...new Set(
        (data[name] || [])
          .filter((r) => r.applicationId === q.applicationId && !isMissing(r))
          .map((r) => r[field]),
      ),
    ],
    updateOne: async (filter, update) => updates.push({ name, filter, update }),
  });
  return { db: { collection }, updates };
}

test("child inherits the single parent tenant; dry run writes nothing", async () => {
  const { db, updates } = fakeDb({
    personaldetails: [{ _id: 1, applicationId: "app-1", tenantId: A }],
    professionaldetails: [{ _id: 2, applicationId: "app-1" }],
    subscriptiondetails: [{ _id: 3, applicationId: "app-1", tenantId: "" }],
  });
  const dry = await propagateFromPersonal(db, false);
  assert.deepStrictEqual(dry, { rows: 2, ambiguous: 0, noApplicationId: 0, noTaggedParent: 0 });
  assert.strictEqual(updates.length, 0);

  await propagateFromPersonal(db, true);
  assert.strictEqual(updates.length, 2);
  for (const u of updates) assert.deepStrictEqual(u.update, { $set: { tenantId: A } });
});

test("applicationId tagged with two tenants is ambiguous and never written", async () => {
  const { db, updates } = fakeDb({
    personaldetails: [
      { _id: 1, applicationId: "app-2", tenantId: A },
      { _id: 4, applicationId: "app-2", tenantId: B },
    ],
    professionaldetails: [{ _id: 2, applicationId: "app-2" }],
    subscriptiondetails: [],
  });
  const out = await propagateFromPersonal(db, true);
  assert.strictEqual(out.ambiguous, 1);
  assert.strictEqual(out.rows, 0);
  assert.strictEqual(updates.length, 0);
});

test("rows with no applicationId or no tagged parent are counted, not guessed", async () => {
  const { db, updates } = fakeDb({
    personaldetails: [{ _id: 1, applicationId: "app-3" }],
    professionaldetails: [{ _id: 2 }, { _id: 3, applicationId: "app-3" }],
    subscriptiondetails: [],
  });
  const out = await propagateFromPersonal(db, true);
  assert.deepStrictEqual(out, { rows: 0, ambiguous: 0, noApplicationId: 1, noTaggedParent: 1 });
  assert.strictEqual(updates.length, 0);
});
