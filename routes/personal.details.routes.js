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

// Admin routes (require authentication + admin role)
// router.get("/all", verifyJWT, verifyRoles(["admin"]), personalDetailsController.getAllPersonalDetails);
// router.get("/search", verifyJWT, verifyRoles(["admin"]), personalDetailsController.searchPersonalDetails);
// router.get("/:id", verifyJWT, verifyRoles(["admin"]), personalDetailsController.getPersonalDetailsById);
// router.delete("/hard-delete", verifyJWT, verifyRoles(["admin"]), personalDetailsController.hardDeletePersonalDetails);
// router.patch("/application-status", verifyJWT, verifyRoles(["admin"]), personalDetailsController.updateApplicationStatus);

module.exports = router;
