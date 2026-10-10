const { AppError } = require("../errors/AppError");

/**
 * Tenant scoping helpers for portal-service.
 *
 * The ONLY trusted tenant source is the authenticated request context set by
 * middlewares/auth.js#authenticate (req.ctx.tenantId) and re-pinned by
 * middlewares/tenantContext.mw.js (req.tenantId). Body/query/params tenantId
 * is never read here.
 */
function getTrustedTenantId(req) {
  const tenantId = req?.ctx?.tenantId || req?.tenantId;
  if (tenantId === undefined || tenantId === null || tenantId === "") {
    return null;
  }
  return String(tenantId);
}

/**
 * Data-layer guard: every query/update/delete on a tenant-owned model must
 * carry a tenant. A missing tenant is a programming/auth error, never a
 * reason to fall back to an unscoped query.
 */
function requireTenantId(tenantId) {
  if (tenantId === undefined || tenantId === null || tenantId === "") {
    throw AppError.forbidden("Tenant context required");
  }
  return String(tenantId);
}

/**
 * D-21: on the non-CRM (portal) branch the query is keyed by the caller's own
 * userId. A null/absent userId must be denied — querying `{ userId: null }`
 * would match CRM-created applications (which store userId: null).
 */
function requirePortalUserId(userId) {
  if (userId === undefined || userId === null || userId === "") {
    throw AppError.forbidden("Access denied");
  }
  return userId;
}

/**
 * Resolve the tenant for an inbound RabbitMQ event: envelope first, then the
 * data mirror. Returns null when neither is present (caller must skip + log).
 */
function getEventTenantId(payload, data) {
  const tenantId = payload?.tenantId ?? data?.tenantId;
  if (tenantId === undefined || tenantId === null || tenantId === "") {
    return null;
  }
  return String(tenantId);
}

module.exports = {
  getTrustedTenantId,
  requireTenantId,
  requirePortalUserId,
  getEventTenantId,
};
