const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.get("/", applicationController.getAllApplications);
router.get("/:applicationId", applicationController.getApplicationById);
router.patch("/:applicationId/status", applicationController.approveApplication);

module.exports = router;
