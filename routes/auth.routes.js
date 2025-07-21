const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyJWT = require("../middlewares/verifyJWT");

router.post("/microsoft", verifyJWT, authController.handleMicrosoftCallback);

module.exports = router;
