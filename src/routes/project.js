const express = require('express');
const router = express.Router();
const {createProject, getAllProjects, getProjectById, updateProject, deleteProject} = require('../controllers/projectController');

router.post("/", createProject); // Create project
router.get("/", getAllProjects); // List all projects
router.get("/:id", getProjectById); // Get project
router.put("/:id", updateProject); // Update project
router.delete("/:id", deleteProject); // Delete project

module.exports = router;