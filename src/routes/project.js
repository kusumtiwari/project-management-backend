const express = require('express');
const router = express.Router();
const {createProject, getAllProjects, getProjectById, updateProject, deleteProject, getProjectMembers} = require('../controllers/projectController');

router.post("/", createProject); // Create project
router.get("/", getAllProjects); // List all projects
router.get("/:id", getProjectById); // Get project
router.put("/:id", updateProject); // Update project
router.delete("/:id", deleteProject); // Delete project
router.get("/:id/members", getProjectMembers); // Get project members for task assignment

module.exports = router;