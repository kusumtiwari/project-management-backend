// src/routes/index.js
const express = require("express");
const {protect} = require('../middleware/authMiddleware')
const router = express.Router();

// Sub-routers (these are now protected)
const projectRoutes = require("./project");
const teamRoutes = require("./teamSetup");
const taskRoutes = require('./task')
const roleRoutes = require('./role')
const dashboardRoutes = require('./dashboard')
// Add more routes like teamRoutes when needed

router.get("/", (req, res) => {
  res.json({ message: "Welcome to PMS Backend!" });
});

router.use("/projects", protect, projectRoutes);
router.use("/tasks", protect, taskRoutes);
router.use("/roles",protect, roleRoutes);
// Add other protected routes here like:
router.use("/teams",protect, teamRoutes);
router.use("/dashboard",protect, dashboardRoutes);

module.exports = router;
