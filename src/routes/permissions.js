const express = require("express");
const router = express.Router();
const {
  getPermissions,
  createPermission,
} = require("../controllers/permissionController");

router.get("/", getPermissions);
router.post("/", createPermission);

module.exports = router;
