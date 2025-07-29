const express = require("express");
const router = express.Router();
const personalDetailsController = require("../controllers/personal.details.controller");
const verifyJWT = require("../middlewares/verifyJWT");
// const verifyRoles = require("../middlewares/verifyRoles");

// User routes (require authentication)
router.post("/", verifyJWT, personalDetailsController.createPersonalDetails);
router.get("/me", verifyJWT, personalDetailsController.getPersonalDetailsByUserId);
router.put("/", verifyJWT, personalDetailsController.updatePersonalDetails);
router.delete("/", verifyJWT, personalDetailsController.deletePersonalDetails);
router.patch("/restore", verifyJWT, personalDetailsController.restorePersonalDetails);

module.exports = router;
