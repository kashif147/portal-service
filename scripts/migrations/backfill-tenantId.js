#!/usr/bin/env node
"use strict";
/**
 * portal-service tenantId backfill — personalDetails / professionaldetails /
 * subscriptiondetails. NOT RUN AUTOMATICALLY. Dry-run by default.
 *
 * See scripts/migrations/README-tenantId-backfill.md for the full plan,
 * ordering and rollback. Summary:
 *
 *   Phase 0  (always)  report: counts of rows missing tenantId per collection.
 *   Phase 1  (always)  intra-service propagation: a professional/subscription
 *                      row with no tenantId inherits the tenantId of the
 *                      personalDetails row with the same applicationId (same
 *                      database — portal-service's own data).
 *   Phase 2  (choose one strategy for personalDetails rows still untagged)
 *     --strategy=profile-http
 *        Source of truth = profile-service over HTTP (never its database).
 *        For every untagged applicationId, ask profile-service once per
 *        candidate tenant, using a CRM bearer token issued FOR that tenant:
 *          GET {PROFILE_SERVICE_URL}/api/applications/:applicationId
 *        Exactly one tenant answering with data  -> assign that tenant.
 *        Zero or several                        -> left untagged + reported.
 *        Pass one `--tenant-token <tenantId>=<jwt>` per tenant (tokens are
 *        read from argv/env only, never logged).
 *     --strategy=single-tenant --tenant=<tenantId> --confirm-single-tenant
 *        For a deployment that has only ever had ONE tenant (today: INMO).
 *        Sets tenantId=<tenantId> on every row where it is missing. Refuses
 *        to run unless --confirm-single-tenant is given AND every row that
 *        already HAS a tenantId carries that same tenant (i.e. there is no
 *        evidence of a second tenant in the data).
 *
 *   Phase 3  (always)  re-run Phase 1 for children of rows tagged in Phase 2,
 *                      then report what is still untagged.
 *
 * Writes only happen with --apply. Only rows whose tenantId is missing/null/""
 * are ever updated (the filter is part of every update), so the script is
 * idempotent and never re-tenants an already-tagged row.
 *
 * Usage:
 *   MONGO_URI=... node scripts/migrations/backfill-tenantId.js \
 *     --strategy=single-tenant --tenant=<INMO tenant _id> --confirm-single-tenant [--apply]
 *   MONGO_URI=... PROFILE_SERVICE_URL=http://profile-service:4002 \
 *     node scripts/migrations/backfill-tenantId.js --strategy=profile-http \
 *     --tenant-token <tenantA>=<crmJwtA> --tenant-token <tenantB>=<crmJwtB> [--apply]
 */

const mongoose = require("mongoose");

const MISSING = { $in: [null, ""] };
const missingTenant = () => ({
  $or: [{ tenantId: { $exists: false } }, { tenantId: MISSING }],
});

function parseArgs(argv) {
  const out = { tenantTokens: {}, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--confirm-single-tenant") out.confirmSingleTenant = true;
    else if (a.startsWith("--strategy=")) out.strategy = a.split("=")[1];
    else if (a.startsWith("--tenant=")) out.tenant = a.split("=")[1];
    else if (a === "--tenant-token") {
      const pair = argv[++i] || "";
      const eq = pair.indexOf("=");
      if (eq > 0) out.tenantTokens[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
  }
  return out;
}

function log(msg, meta) {
  console.log(`[tenant-backfill] ${msg}`, meta ? JSON.stringify(meta) : "");
}

async function report(db) {
  const counts = {};
  for (const name of COLLECTIONS) {
    counts[name] = {
      total: await db.collection(name).countDocuments({}),
      missingTenant: await db.collection(name).countDocuments(missingTenant()),
    };
  }
  return counts;
}

// Collection names as created by the Mongoose models in models/*.js.
const PERSONAL = "personaldetails";
const CHILDREN = ["professionaldetails", "subscriptiondetails"];
const COLLECTIONS = [PERSONAL, ...CHILDREN];

async function propagateFromPersonal(db, apply) {
  let updated = 0;
  for (const child of CHILDREN) {
    const cursor = db
      .collection(child)
      .find(missingTenant(), { projection: { _id: 1, applicationId: 1 } });
    for await (const row of cursor) {
      if (!row.applicationId) continue;
      const parent = await db.collection(PERSONAL).findOne(
        { applicationId: row.applicationId, tenantId: { $nin: [null, ""], $exists: true } },
        { projection: { tenantId: 1 } }
      );
      if (!parent) continue;
      updated += 1;
      if (apply) {
        await db
          .collection(child)
          .updateOne({ _id: row._id, ...missingTenant() }, { $set: { tenantId: parent.tenantId } });
      }
    }
  }
  return updated;
}

async function singleTenant(db, { tenant, confirmSingleTenant, apply }) {
  if (!tenant) throw new Error("--tenant=<tenantId> is required for single-tenant");
  if (!confirmSingleTenant) {
    throw new Error("single-tenant strategy requires --confirm-single-tenant");
  }
  for (const name of COLLECTIONS) {
    const other = await db
      .collection(name)
      .distinct("tenantId", { tenantId: { $exists: true, $nin: [null, "", tenant] } });
    if (other.length > 0) {
      throw new Error(
        `refusing: ${name} already contains rows for ${other.length} other tenant(s); use --strategy=profile-http`
      );
    }
  }
  const result = {};
  for (const name of COLLECTIONS) {
    const n = await db.collection(name).countDocuments(missingTenant());
    result[name] = n;
    if (apply && n > 0) {
      await db.collection(name).updateMany(missingTenant(), { $set: { tenantId: tenant } });
    }
  }
  return result;
}

async function profileHttp(db, { tenantTokens, apply }) {
  const axios = require("axios");
  const base = (process.env.PROFILE_SERVICE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("PROFILE_SERVICE_URL is required for profile-http");
  const tenants = Object.keys(tenantTokens);
  if (tenants.length === 0) throw new Error("at least one --tenant-token is required");

  const resolved = [];
  const unresolved = [];
  const cursor = db
    .collection(PERSONAL)
    .find(missingTenant(), { projection: { _id: 1, applicationId: 1 } });
  for await (const row of cursor) {
    const hits = [];
    for (const tenantId of tenants) {
      // Identity is a real CRM bearer token for that tenant (forwarded as the
      // caller), plus x-tenant-id — never a shared service key.
      const res = await axios.get(
        `${base}/api/applications/${encodeURIComponent(row.applicationId)}`,
        {
          headers: {
            Authorization: `Bearer ${tenantTokens[tenantId]}`,
            "x-tenant-id": tenantId,
          },
          timeout: 10000,
          validateStatus: () => true,
        }
      );
      const data = res.data && typeof res.data.data !== "undefined" ? res.data.data : null;
      if (res.status === 200 && data) hits.push(tenantId);
    }
    if (hits.length === 1) {
      resolved.push({ applicationId: row.applicationId, tenantId: hits[0] });
      if (apply) {
        await db
          .collection(PERSONAL)
          .updateOne({ _id: row._id, ...missingTenant() }, { $set: { tenantId: hits[0] } });
      }
    } else {
      unresolved.push({ applicationId: row.applicationId, matches: hits.length });
    }
  }
  return { resolved: resolved.length, unresolved };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!["single-tenant", "profile-http"].includes(args.strategy)) {
    throw new Error("--strategy=single-tenant|profile-http is required");
  }
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI (portal-service's own DB) is required");

  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  try {
    log(`mode=${args.apply ? "APPLY" : "DRY-RUN"} strategy=${args.strategy}`);
    log("before", await report(db));
    log("phase1 children inheriting parent tenant", {
      rows: await propagateFromPersonal(db, args.apply),
    });
    const phase2 =
      args.strategy === "single-tenant"
        ? await singleTenant(db, args)
        : await profileHttp(db, args);
    log("phase2", phase2);
    log("phase3 children inheriting parent tenant", {
      rows: await propagateFromPersonal(db, args.apply),
    });
    log("after", await report(db));
    if (!args.apply) log("DRY-RUN: nothing was written. Re-run with --apply.");
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[tenant-backfill] failed:", err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, missingTenant };
