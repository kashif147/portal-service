const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// GET /auth/start - Generate Azure B2C authorization URL
router.get("/start", authController.startAuth);

// GET /auth/azure-portal - Handle Azure B2C callback
router.get("/azure-portal", authController.handleAzureCallback);

module.exports = router;
