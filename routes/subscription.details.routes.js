const express = require("express");
const router = express.Router();
const subscriptionDetailsController = require("../controllers/subscription.details.controller");
const { autoRequirePermission } = require("../middlewares/autoPolicy.middleware");

// Auto-derive permissions from route metadata:
// POST /:applicationId → portal:create
// GET /:applicationId → portal:read
// PUT /:applicationId → portal:write
// DELETE /:applicationId → portal:delete

router.post("/:applicationId", autoRequirePermission(), subscriptionDetailsController.createSubscriptionDetails);
router.get("/:applicationId", autoRequirePermission(), subscriptionDetailsController.getSubscriptionDetails);
router.put("/:applicationId", autoRequirePermission(), subscriptionDetailsController.updateSubscriptionDetails);
router.delete("/:applicationId", autoRequirePermission(), subscriptionDetailsController.deleteSubscriptionDetails);

module.exports = router;
