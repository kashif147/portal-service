const express = require("express");
const router = express.Router();
const professionalDetailsController = require("../controllers/professional.details.controller");
const { autoRequirePermission } = require("../middlewares/autoPolicy.middleware");

// Auto-derive permissions from route metadata:
// POST /:applicationId → portal:create
// GET / → portal:read
// GET /:applicationId → portal:read
// PUT /:applicationId → portal:write
// DELETE /:applicationId → portal:delete

router.post("/:applicationId", autoRequirePermission(), professionalDetailsController.createProfessionalDetails);
router.get("/", autoRequirePermission(), professionalDetailsController.getMyProfessionalDetails);
router.get("/:applicationId", autoRequirePermission(), professionalDetailsController.getProfessionalDetails);
router.put("/:applicationId", autoRequirePermission(), professionalDetailsController.updateProfessionalDetails);
router.delete("/:applicationId", autoRequirePermission(), professionalDetailsController.deleteProfessionalDetails);

module.exports = router;
