// src/app.js
const express = require("express");
const cors = require("cors");
const { protect } = require("./middleware/authMiddleware");
const app = express();
app.use(cors({ 
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// Import routes
const authRoutes = require("./routes/auth");
const indexRoutes = require("./routes/index"); // this includes /projects etc.
// Public routes
app.use("/api/auth", authRoutes);
//  Apply protect globally AFTER public routes
app.use(protect);
// All proteted routes (projects, teams, etc.)
app.use("/api", indexRoutes);
module.exports = app;
