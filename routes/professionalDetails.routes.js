const express = require("express");
const router = express.Router();
const professionalDetailsController = require("../controllers/professionalDetails.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, professionalDetailsController.createProfessionalDetails); //token only
router.get("/", verifyJWT, professionalDetailsController.getProfessionalDetailsById); //token only
router.put("/", verifyJWT, professionalDetailsController.updateProfessionalDetails); //token only
router.delete("/", verifyJWT, professionalDetailsController.deleteProfessionalDetails); //token only
router.delete("/hard-delete", verifyJWT, professionalDetailsController.hardDeleteProfessionalDetails); //token only
router.patch("/restore", verifyJWT, professionalDetailsController.restoreProfessionalDetails); //token only

module.exports = router;
