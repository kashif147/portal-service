"use strict";
// In-memory fakes for the three tenant-owned Mongoose models. The REAL model
// classes are loaded (so schema validation via validateSync() still runs on
// create) and their query statics are replaced with an in-memory store. No DB.
//
// Supported query operators: equality (ObjectId/String compared as strings),
// dotted paths, $ne, $in, $or. Update operators: plain object, $set, $unset.
// Every query is recorded in `calls` so tests can assert tenant scoping.

const mongoose = require("mongoose");

const PersonalDetails = require("../../models/personal.details.model");
const ProfessionalDetails = require("../../models/professional.details.model");
const SubscriptionDetails = require("../../models/subscription.model");

const MODELS = {
  personal: PersonalDetails,
  professional: ProfessionalDetails,
  subscription: SubscriptionDetails,
};

const store = { personal: [], professional: [], subscription: [] };
const calls = [];

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}
function unsetPath(obj, path) {
  const keys = path.split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null) return;
    o = o[keys[i]];
  }
  delete o[keys[keys.length - 1]];
}
function eq(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return String(a) === String(b);
}
function matchValue(actual, cond) {
  if (
    cond &&
    typeof cond === "object" &&
    !(cond instanceof mongoose.Types.ObjectId) &&
    !(cond instanceof Date) &&
    Object.keys(cond).some((k) => k.startsWith("$"))
  ) {
    if ("$ne" in cond && eq(actual, cond.$ne)) return false;
    if ("$in" in cond && !cond.$in.some((v) => eq(actual, v))) return false;
    return true;
  }
  return eq(actual, cond);
}
function matches(doc, query = {}) {
  return Object.entries(query).every(([k, v]) => {
    if (k === "$or") return v.some((sub) => matches(doc, sub));
    return matchValue(getPath(doc, k), v);
  });
}
function applyUpdate(doc, update = {}) {
  const hasOps = Object.keys(update).some((k) => k.startsWith("$"));
  const set = hasOps ? update.$set || {} : update;
  for (const [k, v] of Object.entries(set)) setPath(doc, k, v);
  if (hasOps && update.$unset) {
    for (const k of Object.keys(update.$unset)) unsetPath(doc, k);
  }
  doc.updatedAt = new Date();
}
function clone(doc) {
  return doc == null ? doc : JSON.parse(JSON.stringify(doc));
}

// Thenable query object supporting .sort/.populate/.lean chaining.
function query(resultFn) {
  let sortSpec = null;
  const q = {
    sort(spec) {
      sortSpec = spec;
      return q;
    },
    populate() {
      return q;
    },
    lean() {
      return q;
    },
    then(resolve, reject) {
      try {
        let r = resultFn(sortSpec);
        return Promise.resolve(r).then(resolve, reject);
      } catch (e) {
        return Promise.reject(e).then(resolve, reject);
      }
    },
    catch(reject) {
      return q.then(undefined, reject);
    },
  };
  return q;
}

function sortRows(rows, spec) {
  if (!spec) return rows;
  const [[key, dir]] = Object.entries(spec);
  return [...rows].sort((a, b) => {
    const av = new Date(getPath(a, key) || 0).getTime();
    const bv = new Date(getPath(b, key) || 0).getTime();
    return dir < 0 ? bv - av : av - bv;
  });
}

function install() {
  for (const [name, Model] of Object.entries(MODELS)) {
    const rows = () => store[name];
    const log = (op, q, extra) => calls.push({ model: name, op, query: q, ...extra });

    Model.findOne = (q = {}) => {
      log("findOne", q);
      return query((sortSpec) => clone(sortRows(rows().filter((d) => matches(d, q)), sortSpec)[0] || null));
    };
    Model.find = (q = {}) => {
      log("find", q);
      return query((sortSpec) => clone(sortRows(rows().filter((d) => matches(d, q)), sortSpec)));
    };
    Model.findOneAndUpdate = (q = {}, update = {}) => {
      log("findOneAndUpdate", q, { update });
      return query(() => {
        const doc = rows().find((d) => matches(d, q));
        if (!doc) return null;
        applyUpdate(doc, update);
        return clone(doc);
      });
    };
    Model.findOneAndDelete = (q = {}) => {
      log("findOneAndDelete", q);
      return query(() => {
        const i = rows().findIndex((d) => matches(d, q));
        if (i < 0) return null;
        return clone(rows().splice(i, 1)[0]);
      });
    };
    Model.updateMany = async (q = {}, update = {}) => {
      log("updateMany", q, { update });
      const hit = rows().filter((d) => matches(d, q));
      hit.forEach((d) => applyUpdate(d, update));
      return { matchedCount: hit.length, modifiedCount: hit.length };
    };
    Model.updateOne = async (q = {}, update = {}) => {
      log("updateOne", q, { update });
      const doc = rows().find((d) => matches(d, q));
      if (!doc) return { matchedCount: 0, modifiedCount: 0 };
      applyUpdate(doc, update);
      return { matchedCount: 1, modifiedCount: 1 };
    };
    Model.create = async (data) => {
      log("create", null, { data });
      const doc = new Model(data);
      const err = doc.validateSync();
      if (err) throw err;
      const plain = JSON.parse(JSON.stringify(doc.toObject()));
      plain.createdAt = plain.createdAt || new Date().toISOString();
      plain.updatedAt = plain.updatedAt || new Date().toISOString();
      rows().push(plain);
      return clone(plain);
    };
    // Raw driver access used by membershipCategory/subscription handlers.
    Object.defineProperty(Model, "collection", {
      configurable: true,
      get() {
        return {
          findOne: async (q) => {
            log("collection.findOne", q);
            return clone(rows().find((d) => matches(d, q)) || null);
          },
          updateOne: async (q, update) => {
            log("collection.updateOne", q, { update });
            const doc = rows().find((d) => matches(d, q));
            if (doc) applyUpdate(doc, update);
            return { matchedCount: doc ? 1 : 0 };
          },
        };
      },
    });
  }
}

function reset() {
  store.personal.length = 0;
  store.professional.length = 0;
  store.subscription.length = 0;
  calls.length = 0;
}

function seed(name, doc) {
  const row = {
    _id: new mongoose.Types.ObjectId().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    meta: { deleted: false, isActive: true },
    ...doc,
  };
  store[name].push(row);
  return row;
}

module.exports = { install, reset, seed, store, calls, MODELS };
