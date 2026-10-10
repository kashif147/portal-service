const { tenantContextMiddleware } = require("@membership/policy-middleware");

/**
 * Phase 1A canonical tenant-context guard — WARN MODE ONLY (non-blocking).
 *
 * Mounted globally in app.js right AFTER `app.use(authenticate)` (the trusted
 * identity/tenant-establishing middleware) and BEFORE the `/api` routers, so it
 * runs before each route's `autoRequirePermission()`:
 *   authenticate -> tenantContextWarn -> autoRequirePermission -> handler
 *
 * It observes the trusted tenant already on req.ctx/req.user/req.tenantId,
 * re-pins req.tenantId (and req.ctx.tenantId) to it, and LOGS any
 * caller-supplied (body/query/params) tenantId that disagrees as a
 * non-blocking TenantContextMismatch event. It never returns 403.
 *
 * portal-service controllers derive tenant only via
 * helpers/tenantScope.js#getTrustedTenantId (req.ctx.tenantId, then
 * req.tenantId) — never from body/query/params — so the guard's re-pinned
 * trusted tenant aligns directly with controller behaviour.
 */
const tenantContextWarn = tenantContextMiddleware({ mode: "warn" });

module.exports = {
  tenantContextWarn,
};
