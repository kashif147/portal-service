const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, subscriptionController.createSubscription); //token only
router.get("/", verifyJWT, subscriptionController.getSubscriptionById); //token only
router.get("/profile", verifyJWT, subscriptionController.getSubscriptionByProfileId); //token only
router.get("/all", verifyJWT, subscriptionController.getAllSubscriptions);
router.put("/", verifyJWT, subscriptionController.updateSubscription); //token only
router.delete("/", verifyJWT, subscriptionController.deleteSubscription); //token only
router.delete("/hard-delete", verifyJWT, subscriptionController.hardDeleteSubscription); //token only
router.patch("/restore", verifyJWT, subscriptionController.restoreSubscription); //token only
router.get(
  "/membership-category/:membershipCategory",
  verifyJWT,
  subscriptionController.getSubscriptionsByMembershipCategory
);
router.get("/active", verifyJWT, subscriptionController.getActiveSubscriptions);
router.get("/inactive", verifyJWT, subscriptionController.getInactiveSubscriptions);

module.exports = router;
