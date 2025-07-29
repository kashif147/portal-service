const express = require("express");
const router = express.Router();
const subscriptionDetailsController = require("../controllers/subscription.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", subscriptionDetailsController.createSubscriptionDetails); //token only
router.get("/", subscriptionDetailsController.getSubscriptionDetails); //token only
router.get("/me", subscriptionDetailsController.getSubscriptionDetailsByUserId); //token only
router.put("/", subscriptionDetailsController.updateSubscriptionDetails); //token only
router.delete("/", subscriptionDetailsController.deleteSubscriptionDetails); //token only
router.patch("/restore", subscriptionDetailsController.restoreSubscriptionDetails); //token only

module.exports = router;
