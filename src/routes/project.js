const express = require('express');
const router = express.Router();
const {createProject, getAllProjects} = require('../controllers/projectController');

router.post("/", createProject); // Create project
router.get("/", getAllProjects); // List all projects

module.exports = router;