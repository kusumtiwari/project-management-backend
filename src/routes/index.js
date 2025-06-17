// src/routes/index.js
const express = require("express");
const router = express.Router();

// Sub-routers
const authRoutes = require("./auth");
const projectRoutes = require("./project");

router.get("/", (req, res) => {
  res.json({ message: "Welcome to PMS Backend!" });
});

router.use("/auth", authRoutes); // /api/auth
router.use("/projects", projectRoutes); // /api/projects

module.exports = router;
