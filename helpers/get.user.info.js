function extractUserAndCreatorContext(req) {
  const userType = req.user?.userType;
  const creatorId = req.user?.id || req.user?._id;

  let userId = null;

  if (userType === "PORTAL") {
    userId = creatorId;
  } else if (userType === "CRM") {
    userId = null;
  }

  // Debug logging to help troubleshoot user context issues
  console.log("=== extractUserAndCreatorContext DEBUG ===");
  console.log("req.user:", JSON.stringify(req.user, null, 2));
  console.log("userType:", userType);
  console.log("creatorId:", creatorId);
  console.log("userId:", userId);
  console.log("=== END DEBUG ===");

  return {
    userType,
    userId,
    creatorId,
  };
}

module.exports = { extractUserAndCreatorContext };
