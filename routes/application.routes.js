const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.get("/", verifyJWT, applicationController.getAllApplications);
router.get("/:applicationId", verifyJWT, applicationController.getApplicationById);
router.patch("/:applicationId/status", verifyJWT, applicationController.approveApplication);

module.exports = router;
