const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, subscriptionController.createSubscription);
router.get("/:id", verifyJWT, subscriptionController.getSubscriptionById);
router.get("/profile/:profileId", verifyJWT, subscriptionController.getSubscriptionByProfileId);
router.get("/", verifyJWT, subscriptionController.getAllSubscriptions);
router.put("/:id", verifyJWT, subscriptionController.updateSubscription);
router.delete("/:id", verifyJWT, subscriptionController.deleteSubscription);
router.delete("/:id/hard-delete", verifyJWT, subscriptionController.hardDeleteSubscription);
router.patch("/:id/restore", verifyJWT, subscriptionController.restoreSubscription);
router.get(
  "/membership-category/:membershipCategory",
  verifyJWT,
  subscriptionController.getSubscriptionsByMembershipCategory
);
router.get("/active", verifyJWT, subscriptionController.getActiveSubscriptions);
router.get("/inactive", verifyJWT, subscriptionController.getInactiveSubscriptions);

module.exports = router;
