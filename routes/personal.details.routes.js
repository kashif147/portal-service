const express = require("express");
const router = express.Router();
const personalDetailsController = require("../controllers/personal.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, personalDetailsController.createPersonalDetails);
router.get("/", verifyJWT, personalDetailsController.getMyPersonalDetails);
router.get("/:applicationId", verifyJWT, personalDetailsController.getPersonalDetails);
router.put("/:applicationId", verifyJWT, personalDetailsController.updatePersonalDetails);
router.delete("/:applicationId", verifyJWT, personalDetailsController.deletePersonalDetails);

module.exports = router;
