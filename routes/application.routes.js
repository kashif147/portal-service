const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const { autoRequirePermission } = require("../middlewares/autoPolicy.middleware");

// Auto-derive permissions from route metadata:
// GET / → portal:read
// GET /:applicationId → portal:read

router.get("/", autoRequirePermission(), applicationController.getAllApplications);
router.get("/:applicationId", autoRequirePermission(), applicationController.getApplicationById);

// NOTE: Application approval is handled in profile-service by CRM users
// Portal service only stores and syncs application data
// router.put(
//   "/status/:applicationId",
//   autoRequirePermission(), // Would auto-derive portal:write
//   applicationController.approveApplication
// );

module.exports = router;
