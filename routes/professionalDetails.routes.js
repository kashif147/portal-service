const express = require("express");
const router = express.Router();
const professionalDetailsController = require("../controllers/professionalDetails.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, professionalDetailsController.createProfessionalDetails);
router.get("/:id", verifyJWT, professionalDetailsController.getProfessionalDetailsById);
router.get("/profile/:profileId", verifyJWT, professionalDetailsController.getProfessionalDetailsByProfileId);
router.put("/:id", verifyJWT, professionalDetailsController.updateProfessionalDetails);
router.delete("/:id", verifyJWT, professionalDetailsController.deleteProfessionalDetails);
router.delete("/:id/hard-delete", verifyJWT, professionalDetailsController.hardDeleteProfessionalDetails);
router.patch("/:id/restore", verifyJWT, professionalDetailsController.restoreProfessionalDetails);

module.exports = router;
