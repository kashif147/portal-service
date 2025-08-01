const express = require("express");
const router = express.Router();
const subscriptionDetailsController = require("../controllers/subscription.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, subscriptionDetailsController.createSubscriptionDetails); //token only
router.get("/", verifyJWT, subscriptionDetailsController.getSubscriptionDetails); //token only
router.get("/:applicationId", verifyJWT, subscriptionDetailsController.getSubscriptionDetails); //CRM with applicationId
router.put("/", verifyJWT, subscriptionDetailsController.updateSubscriptionDetails); //token only
router.put("/:applicationId", verifyJWT, subscriptionDetailsController.updateSubscriptionDetails); //CRM with applicationId
router.delete("/", verifyJWT, subscriptionDetailsController.deleteSubscriptionDetails); //token only
router.delete("/:applicationId", verifyJWT, subscriptionDetailsController.deleteSubscriptionDetails); //CRM with applicationId

module.exports = router;
