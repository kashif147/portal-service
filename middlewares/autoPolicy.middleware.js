/**
 * Auto-Policy Middleware
 * Automatically derives resource and action from route metadata
 * Eliminates manual permission mapping bugs
 */

const { defaultPolicyMiddleware } = require("./policy.middleware");

/**
 * Route-to-Resource Mapping
 * Maps route paths to resource names
 */
const ROUTE_RESOURCE_MAP = {
  // Portal resources
  "/api/personal-details": "portal",
  "/api/professional-details": "portal",
  "/api/subscription-details": "portal",
  "/api/applications": "portal",
  "/api/dashboard": "portal",
  "/api/events": "portal",
  "/api/resources": "portal",
  "/api/profile": "portal",
  "/api/subscriptions": "portal",
  
  // Add more mappings as needed
};

/**
 * HTTP Method to Action Mapping
 */
const METHOD_ACTION_MAP = {
  GET: "read",
  POST: "create",
  PUT: "write",
  PATCH: "write",
  DELETE: "delete",
};

/**
 * Derive resource from route path
 * @param {string} path - Route path (e.g., "/api/personal-details" or "/personal-details")
 * @param {string} originalUrl - Full original URL (e.g., "/api/personal-details/:id")
 * @returns {string} Resource name (e.g., "portal")
 */
function deriveResourceFromPath(path, originalUrl = null) {
  // Use originalUrl if available (includes full path including mount point)
  const fullPath = originalUrl || path;
  
  // Remove query params and trailing slashes
  const cleanPath = fullPath.split("?")[0].replace(/\/$/, "");
  
  // Check exact match first
  if (ROUTE_RESOURCE_MAP[cleanPath]) {
    return ROUTE_RESOURCE_MAP[cleanPath];
  }
  
  // Check prefix matches (e.g., "/api/personal-details/:id" → "/api/personal-details")
  for (const [routePattern, resource] of Object.entries(ROUTE_RESOURCE_MAP)) {
    if (cleanPath.startsWith(routePattern + "/") || cleanPath === routePattern) {
      return resource;
    }
  }
  
  // Check if path starts with any mapped route (for mounted routes)
  // e.g., "/personal-details" matches "/api/personal-details" when mounted at /api
  for (const [routePattern, resource] of Object.entries(ROUTE_RESOURCE_MAP)) {
    const patternWithoutApi = routePattern.replace(/^\/api/, "");
    if (cleanPath.startsWith(patternWithoutApi) || cleanPath === patternWithoutApi) {
      return resource;
    }
  }
  
  // Default: derive from first path segment after /api
  const segments = cleanPath.split("/");
  if (segments.length >= 2 && segments[1] === "api") {
    // Extract resource from path (e.g., "/api/personal-details" → "portal")
    const resourceSegment = segments[2] || segments[1];
    // Convert kebab-case to resource name
    return resourceSegment.replace(/-details$/, "").replace(/-/g, "_");
  }
  
  // Fallback: use "portal" for portal-service
  return "portal";
}

/**
 * Derive action from HTTP method
 * @param {string} method - HTTP method (e.g., "POST")
 * @returns {string} Action name (e.g., "create")
 */
function deriveActionFromMethod(method) {
  return METHOD_ACTION_MAP[method.toUpperCase()] || "read";
}

/**
 * Auto-require permission middleware
 * Automatically derives resource and action from route metadata
 * 
 * Usage:
 *   router.post("/", autoRequirePermission(), controller.create);
 *   router.get("/", autoRequirePermission(), controller.read);
 *   router.put("/:id", autoRequirePermission(), controller.update);
 *   router.delete("/:id", autoRequirePermission(), controller.delete);
 * 
 * Or with explicit override:
 *   router.post("/", autoRequirePermission("portal", "create"), controller.create);
 */
function autoRequirePermission(resourceOverride = null, actionOverride = null) {
  return (req, res, next) => {
    // Use overrides if provided, otherwise auto-derive
    // Use originalUrl to get full path including mount point
    const path = req.originalUrl || req.path || req.route?.path || "";
    const resource = resourceOverride || deriveResourceFromPath(path, req.originalUrl);
    const action = actionOverride || deriveActionFromMethod(req.method);
    
    // Log for debugging (can be removed in production)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AUTO_POLICY] ${req.method} ${path} → resource: "${resource}", action: "${action}"`);
    }
    
    // Apply the permission check using the standard middleware
    return defaultPolicyMiddleware.requirePermission(resource, action)(req, res, next);
  };
}

/**
 * Create route with auto-permission
 * Helper function for cleaner route definitions
 * 
 * Usage:
 *   const router = createAutoPolicyRouter();
 *   router.post("/", controller.create);
 *   router.get("/", controller.read);
 */
function createAutoPolicyRouter() {
  const express = require("express");
  const router = express.Router();
  
  // Wrap router methods to auto-apply permissions
  const originalMethods = {
    get: router.get.bind(router),
    post: router.post.bind(router),
    put: router.put.bind(router),
    patch: router.patch.bind(router),
    delete: router.delete.bind(router),
  };
  
  // Override methods to auto-inject permission middleware
  router.get = function(path, ...handlers) {
    return originalMethods.get(path, autoRequirePermission(), ...handlers);
  };
  
  router.post = function(path, ...handlers) {
    return originalMethods.post(path, autoRequirePermission(), ...handlers);
  };
  
  router.put = function(path, ...handlers) {
    return originalMethods.put(path, autoRequirePermission(), ...handlers);
  };
  
  router.patch = function(path, ...handlers) {
    return originalMethods.patch(path, autoRequirePermission(), ...handlers);
  };
  
  router.delete = function(path, ...handlers) {
    return originalMethods.delete(path, autoRequirePermission(), ...handlers);
  };
  
  // Preserve other router methods
  router.use = router.use.bind(router);
  router.all = router.all.bind(router);
  router.param = router.param.bind(router);
  router.route = router.route.bind(router);
  
  return router;
}

module.exports = {
  autoRequirePermission,
  createAutoPolicyRouter,
  deriveResourceFromPath,
  deriveActionFromMethod,
  ROUTE_RESOURCE_MAP,
  METHOD_ACTION_MAP,
};

