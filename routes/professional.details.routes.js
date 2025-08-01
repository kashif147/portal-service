const express = require("express");
const router = express.Router();
const professionalDetailsController = require("../controllers/professional.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, professionalDetailsController.createProfessionalDetails); //token only
router.get("/", verifyJWT, professionalDetailsController.getProfessionalDetails); //token only
router.get("/:applicationId", verifyJWT, professionalDetailsController.getProfessionalDetails); //CRM with applicationId
router.put("/", verifyJWT, professionalDetailsController.updateProfessionalDetails); //token only
router.put("/:applicationId", verifyJWT, professionalDetailsController.updateProfessionalDetails); //CRM with applicationId
router.delete("/", verifyJWT, professionalDetailsController.deleteProfessionalDetails); //token only
router.delete("/:applicationId", verifyJWT, professionalDetailsController.deleteProfessionalDetails); //CRM with applicationId

module.exports = router;
