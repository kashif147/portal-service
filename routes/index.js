const express = require("express");
const router = express.Router();

router.use("/personal-details", require("./personal.details.routes"));
router.use("/professional-details", require("./professional.details.routes"));
router.use("/subscriptions", require("./subscription.routes"));
// router.use("/user-information", require("./userInformationFlow.routes"));

module.exports = router;
