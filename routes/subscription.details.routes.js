const express = require("express");
const router = express.Router();
const subscriptionDetailsController = require("../controllers/subscription.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/:applicationId", verifyJWT, subscriptionDetailsController.createSubscriptionDetails);
router.get("/:applicationId", verifyJWT, subscriptionDetailsController.getSubscriptionDetails);
router.put("/:applicationId", verifyJWT, subscriptionDetailsController.updateSubscriptionDetails);
router.delete("/:applicationId", verifyJWT, subscriptionDetailsController.deleteSubscriptionDetails);

module.exports = router;
