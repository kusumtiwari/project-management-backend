const express = require("express");
const router = express.Router();
const {
  getAllPermissions,
  createRole,
  getAllRoles,
  assignRoleToMember,
  updateRole,
  deleteRole,
} = require("../controllers/RoleController");

// Routes
router.get("/permissions", getAllPermissions); // Get all available permissions
router.post("/", createRole); // Create a new role
router.get("/", getAllRoles); // Get all roles
router.post("/assign", assignRoleToMember); // Assign a role to a user for a team
router.put("/:id", updateRole); // Update role
router.delete("/:id", deleteRole); // Delete role

module.exports = router;
