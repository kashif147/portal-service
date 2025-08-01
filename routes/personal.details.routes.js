const express = require("express");
const router = express.Router();
const personalDetailsController = require("../controllers/personal.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/", verifyJWT, personalDetailsController.createPersonalDetails);
router.get("/", verifyJWT, personalDetailsController.getPersonalDetails);
router.get("/:email", verifyJWT, personalDetailsController.getPersonalDetails);
router.put("/", verifyJWT, personalDetailsController.updatePersonalDetails);
router.put("/:email", verifyJWT, personalDetailsController.updatePersonalDetails);
router.delete("/", verifyJWT, personalDetailsController.deletePersonalDetails);
router.delete("/:email", verifyJWT, personalDetailsController.deletePersonalDetails);

module.exports = router;
