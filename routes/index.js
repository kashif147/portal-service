const express = require("express");
const router = express.Router();

router.use("/personal-details", require("./personalDetails.routes"));
router.use("/professional-details", require("./professionalDetails.routes"));
router.use("/subscriptions", require("./subscription.routes"));

module.exports = router;
