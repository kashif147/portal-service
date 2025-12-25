const express = require("express");
const router = express.Router();
const personalDetailsController = require("../controllers/personal.details.controller");
const { autoRequirePermission } = require("../middlewares/autoPolicy.middleware");

// Auto-derive permissions from route metadata:
// POST / → portal:create
// GET / → portal:read
// GET /:applicationId → portal:read
// GET /:applicationId/status → portal:read
// PUT /:applicationId → portal:write
// DELETE /:applicationId → portal:delete

router.post("/", autoRequirePermission(), personalDetailsController.createPersonalDetails);
router.get("/", autoRequirePermission(), personalDetailsController.getMyPersonalDetails);
router.get("/:applicationId", autoRequirePermission(), personalDetailsController.getPersonalDetails);
router.get("/:applicationId/status", autoRequirePermission(), personalDetailsController.getApplicationStatus);
router.put("/:applicationId", autoRequirePermission(), personalDetailsController.updatePersonalDetails);
router.delete("/:applicationId", autoRequirePermission(), personalDetailsController.deletePersonalDetails);

module.exports = router;
