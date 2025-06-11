// src/routes/index.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Welcome to PMS Backend!" });
});

module.exports = router;
