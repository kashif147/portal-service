function extractUserAndCreatorContext(req) {
  const userType = req.user?.userType;
  const creatorId = req.user?.id || req.user?._id;

  let userId = null;

  if (userType === "PORTAL") {
    userId = creatorId;
  } else if (userType === "CRM") {
    userId = null;
  }

  // SECURITY: Never create bypass user context
  // Authentication endpoints must have valid user context from token
  if (process.env.AUTH_BYPASS_ENABLED === "true" && !userId) {
    console.error("=== SECURITY ERROR: Attempted to create bypass user context ===");
    console.error("Bypass should never be used to create mock user identities");
    // Return null values instead of bypass values - caller should handle missing user
    userId = null;
    creatorId = creatorId || null;
    // Keep original userType, don't override
  }

  // Debug logging to help troubleshoot user context issues
  console.log("=== extractUserAndCreatorContext DEBUG ===");
  console.log("req.user:", JSON.stringify(req.user, null, 2));
  console.log("userType:", userType);
  console.log("creatorId:", creatorId);
  console.log("userId:", userId);
  console.log("AUTH_BYPASS_ENABLED:", process.env.AUTH_BYPASS_ENABLED);
  console.log("=== END DEBUG ===");

  return {
    userType,
    userId,
    creatorId,
  };
}

module.exports = { extractUserAndCreatorContext };
