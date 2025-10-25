function extractUserAndCreatorContext(req) {
  const userType = req.user?.userType;
  const creatorId = req.user?.id || req.user?._id;

  let userId = null;

  if (userType === "PORTAL") {
    userId = creatorId;
  } else if (userType === "CRM") {
    userId = null;
  }

  // TEMPORARY: Handle auth bypass case
  if (process.env.AUTH_BYPASS_ENABLED === "true" && !userId) {
    console.log("=== AUTH BYPASS: Creating mock user context ===");
    userId = "bypass-user-id";
    creatorId = "bypass-user-id";
    userType = "PORTAL";
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
