const express = require("express");
const router = express.Router();
const lookupController = require("../controllers/lookupController");
const ROLES_LIST = require("../config/roles_list");
const verifyRoles = require("../middlewares/verifyRoles");
const verifyJWT = require("../middlewares/verifyJWT");

// Get all lookups
router
  .route("/")
  .get(verifyJWT, lookupController.getAllLookup)
  .post(verifyJWT, verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor), lookupController.createNewLookup)
  .put(verifyJWT, verifyRoles(ROLES_LIST.Admin, ROLES_LIST.Editor), lookupController.updateLookup)
  .delete(verifyJWT, verifyRoles(ROLES_LIST.Admin), lookupController.deleteLookup);

// Get lookup by ID
router.route("/:id").get(verifyJWT, lookupController.getLookup);

module.exports = router;
