const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const verifyJWT = require("../middlewares/verifyJWT");

//WILL ADD MIDDLEWARE ONCE TESTING IS DONE
// router.get("/", verifyJWT, applicationController.getAllApplications);
// router.get("/:applicationId", verifyJWT, applicationController.getApplicationById);
// router.patch("/:applicationId/status", verifyJWT, applicationController.approveApplication);

router.get("/", applicationController.getAllApplications);
router.get("/:applicationId", applicationController.getApplicationById);
router.patch("/:applicationId/status", applicationController.approveApplication);

module.exports = router;
