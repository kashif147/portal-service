const express = require("express");
const router = express.Router();
const professionalDetailsController = require("../controllers/professional.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/:applicationId", verifyJWT, professionalDetailsController.createProfessionalDetails);
router.get("/:applicationId", verifyJWT, professionalDetailsController.getProfessionalDetails);
router.put("/:applicationId", verifyJWT, professionalDetailsController.updateProfessionalDetails);
router.delete("/:applicationId", verifyJWT, professionalDetailsController.deleteProfessionalDetails);

module.exports = router;
