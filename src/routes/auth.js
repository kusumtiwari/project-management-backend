const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

// Register (with team creation)
router.post("/register", AuthController.register);

// Login
router.post("/login", AuthController.login);
router.get("/verify-email", AuthController.verifyEmail); 

module.exports = router;
