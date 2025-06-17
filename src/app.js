// src/app.js
const express = require("express");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json());

// Centralized routes
const indexRoutes = require("./routes/index");
app.use("/api", indexRoutes);

module.exports = app;
