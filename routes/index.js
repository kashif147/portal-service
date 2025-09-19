const express = require("express");
const router = express.Router();

router.use("/personal-details", require("./personal.details.routes"));
router.use("/professional-details", require("./professional.details.routes"));
router.use("/subscription-details", require("./subscription.details.routes"));
router.use("/applications", require("./application.routes"));
router.use("/test-auth", require("./test-auth.routes"));

module.exports = router;
