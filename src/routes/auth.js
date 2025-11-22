const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const { protect } = require("../middleware/authMiddleware");

// Register (with team creation)
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/create-team-member", protect, AuthController.createTeamMember);
router.post("/logout", AuthController.logout);

module.exports = router;
