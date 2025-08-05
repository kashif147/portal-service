const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.get("/", verifyJWT, applicationController.getAllApplications);
router.get("/:applicationId", verifyJWT, applicationController.getApplicationById);
router.put("/status/:applicationId", verifyJWT, applicationController.approveApplication);

module.exports = router;
