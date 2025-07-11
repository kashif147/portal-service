const express = require("express");
const router = express.Router();
const personalDetailsController = require("../controllers/personalDetails.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, personalDetailsController.createPersonalDetails);
router.get("/:id", verifyJWT, personalDetailsController.getPersonalDetailsById);
router.get("/user/:userId", verifyJWT, personalDetailsController.getPersonalDetailsByUserId);
router.put("/:id", verifyJWT, personalDetailsController.updatePersonalDetails);
router.delete("/:id", verifyJWT, personalDetailsController.deletePersonalDetails);
router.delete("/:id/hard-delete", verifyJWT, personalDetailsController.hardDeletePersonalDetails);
router.patch("/:id/restore", verifyJWT, personalDetailsController.restorePersonalDetails);

module.exports = router;
