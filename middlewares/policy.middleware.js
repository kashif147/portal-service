/**
 * Centralized RBAC Policy Middleware
 * Uses shared policy middleware package
 */

const {
  createDefaultPolicyMiddleware,
} = require("@membership/policy-middleware");

// Create default policy middleware instance
const defaultPolicyMiddleware = createDefaultPolicyMiddleware(
  process.env.POLICY_SERVICE_URL ||
    "https://userserviceshell-aqf6f0b8fqgmagch.canadacentral-01.azurewebsites.net",
  {
    timeout: 15000, // Increased timeout for Azure
    retries: 5, // More retries for Azure
    cacheTimeout: 300000, // 5 minutes
    retryDelay: 2000, // Base delay between retries
  }
);

module.exports = defaultPolicyMiddleware;
module.exports.defaultPolicyMiddleware = defaultPolicyMiddleware;
