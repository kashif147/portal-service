const express = require("express");
const router = express.Router();
const personalDetailsController = require("../controllers/personalDetails.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, personalDetailsController.createPersonalDetails); //done
router.get("/me", verifyJWT, personalDetailsController.getPersonalDetailsByUserId); //done
router.get("/:id", verifyJWT, personalDetailsController.getPersonalDetailsById);
router.put("/", verifyJWT, personalDetailsController.updatePersonalDetails); //token only
router.delete("/", verifyJWT, personalDetailsController.deletePersonalDetails); //token only
router.delete("/hard-delete", verifyJWT, personalDetailsController.hardDeletePersonalDetails); //token only
router.patch("/restore", verifyJWT, personalDetailsController.restorePersonalDetails); //token only

module.exports = router;
