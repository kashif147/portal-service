const express = require("express");
const router = express.Router();
const userInformationFlowController = require("../controllers/userInformationFlow.controller");
const verifyJWT = require("../middlewares/verifyJWT");

// Submit complete user information (personal, professional, subscription)
router.post("/submit", verifyJWT, userInformationFlowController.submitUserInformation);

// Get complete user information
router.get("/", verifyJWT, userInformationFlowController.getUserInformation);

// Update user information
router.put("/update", verifyJWT, userInformationFlowController.updateUserInformation);

module.exports = router; 