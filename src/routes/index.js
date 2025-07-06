// src/routes/index.js
const express = require("express");
const router = express.Router();

// Sub-routers (these are now protected)
const projectRoutes = require("./project");
const teamRoutes = require("./teamSetup")
// Add more routes like teamRoutes when needed

router.get("/", (req, res) => {
  res.json({ message: "Welcome to PMS Backend!" });
});

router.use("/projects", projectRoutes);
// Add other protected routes here like:
router.use("/teams", teamRoutes);

module.exports = router;
