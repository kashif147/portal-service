# portal-service: tenantId migration plan (Phase 2B Stream 3A / audit M5)

Not executed. This is the runbook for the code change that adds a required
`tenantId` to `personalDetails`, `ProfessionalDetails` and `subscriptionDetails`
and scopes every query by it.

## Why order matters

After this release every read, update, delete and listener lookup filters on
`tenantId`. A legacy row with no `tenantId` is **invisible**. It is not leaked,
but members and CRM users stop seeing in-flight applications, and payment or
approval events for those rows get logged as "not found" and are skipped. So
**the backfill must finish before the new code serves traffic.**

`required: true` and legacy rows:

- `Model.create()`/`save()` validate the whole document. Every create path now
  stamps the trusted tenant, so new rows always pass. Nothing in this service
  calls `.save()` on a loaded legacy document.
- `findOneAndUpdate(..., { runValidators: true })` only validates the paths in
  the update. A legacy row without `tenantId` would not fail validation. It just
  won't match the tenant-scoped filter in the first place.
- The backfill uses the raw driver (`db.collection(...)`), so Mongoose
  validation never blocks it.

## Order

1. **Build the new indexes first**, before deploying the code that relies on
   them. Run them online, against portal-service's own DB only:
   ```js
   db.personaldetails.createIndex({ tenantId: 1, applicationId: 1 })
   db.personaldetails.createIndex({ tenantId: 1, userId: 1 })
   db.professionaldetails.createIndex({ tenantId: 1, applicationId: 1 })
   db.professionaldetails.createIndex({ tenantId: 1, userId: 1 })
   db.subscriptiondetails.createIndex({ tenantId: 1, applicationId: 1 })
   db.subscriptiondetails.createIndex({ tenantId: 1, userId: 1 })
   ```
   Mongoose `autoIndex` would also create these when the new code boots. Doing
   it by hand first avoids a build under live load. The indexes are not unique,
   so legacy rows with no `tenantId` cannot make a build fail. Keep the old
   `{ applicationId: 1 }` (unique on personaldetails) and `{ userId: 1 }`
   indexes. Drop them only after a soak (step 6).
2. **Dry-run the backfill**: `node scripts/migrations/backfill-tenantId.js ...`
   with no `--apply`. Review the before/after counts and the per-tenant
   `byTenant` distribution. The script exits with code 2 and logs `STOP` when
   a child row's `applicationId` belongs to personalDetails rows tagged with
   more than one tenant (`ambiguous`); those rows are never written. Resolve
   them before `--apply`. Output is aggregate only (no applicationIds).
3. **Run the backfill with `--apply`.** It only touches rows whose `tenantId` is
   missing, null or `""`, so it is idempotent and safe to re-run.
4. **Verify** that every collection reports `missingTenant: 0`. Re-run the dry-run;
   it is just the report. Resolve anything left "unresolved" (see below) before
   continuing.
5. **Deploy the portal-service code.** Deploy order relative to other services:
   - profile-service already reads `data.tenantId` (and falls back to
     `personalDetails.tenantId`) when it consumes `profile.application.create`.
     The envelope `tenantId` this release adds is additive, so neither side
     needs to deploy first.
   - account-service (`application.status.submitted`), profile-service
     (`applications.review.*.v1`) and subscription-service
     (`members.subscription.*.v1`) already publish `tenantId` in both the
     envelope and the data, so the consumers here get a tenant today. Messages
     published before this release that have no tenant are skipped and logged.
   - The policy-middleware pin moves to `1d4a3b9`, which exports
     `tenantContextMiddleware`. That commit must stay reachable on GitHub.
6. After a soak, optionally drop the legacy single-field indexes.

## Choosing a source of truth (phase 2 of the script)

The tenant must come from this service's own data, profile-service **over
HTTP**, or the event history. It must never come from another service's
database.

### A. `--strategy=single-tenant` (current DEV/production reality)

This deployment has only ever served one tenant (INMO), so every existing row
belongs to INMO. The script sets the given tenant on rows missing one, and
refuses to run unless both of these hold:
- `--confirm-single-tenant` is passed, and
- no row in any of the three collections already has a different tenantId
  (that would be evidence of a second tenant).

Pass the INMO `Tenant._id` explicitly with `--tenant=<id>`. Nothing in code
defaults to it.

### B. `--strategy=profile-http` (multi-tenant data already present)

For each untagged `applicationId`, the script calls
`GET {PROFILE_SERVICE_URL}/api/applications/:applicationId` once per candidate
tenant. Each call uses a CRM bearer token for that tenant (`--tenant-token
<tenantId>=<jwt>`), forwarded as the caller's identity with `x-tenant-id`. No
shared API key is involved. Exactly one tenant returning data means that tenant
is assigned. Zero or several matches leave the row untagged and list it.

This only works once profile-service's own reads are tenant-scoped (its Phase 2
stream). Otherwise every tenant's token "sees" every application, and
everything ends up ambiguous, which is safe but resolves nothing. It also only
covers applications that reached profile-service, i.e. `submitted` or later
(they were synced via `profile.application.create`). In-progress drafts that
never left the portal cannot be resolved this way.

### C. Event history (for rows B leaves unresolved)

The `profile.application.create`, `application.status.submitted` and
`applications.review.*` events carry `data.tenantId`. Their history is
retrievable via the audit-service HTTP API (or reporting-service), not by
reading those services' stores. An operator can build an
`applicationId -> tenantId` list from it and apply it with a targeted
`updateOne({ applicationId, tenantId: {$in:[null,""]} }, ...)`, following the
same idempotent pattern. Anything still unresolved after that is an in-progress
draft that never emitted an event. The fix there is a manual decision, or
contacting the member.

## Phase 1/3: child propagation

`professionaldetails` and `subscriptiondetails` rows inherit the `tenantId` of
the `personaldetails` row with the same `applicationId`. All three collections
are portal-service's own database, so no boundary is crossed.

## Rollback

The code can be rolled back on its own. The previous release ignores
`tenantId`, so the backfilled field is harmless to it. The new indexes can stay.
