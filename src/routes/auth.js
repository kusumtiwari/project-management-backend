const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // adjust the path if needed
require("dotenv").config();

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body; // Changed from username to email

  try {
    // 1. Find user by email
    const user = await User.findOne({ email }); // Changed from username to email
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // 2. Compare password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email }, // Changed from username to email
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 4. Send token as response
    res.status(200).json({
      success: true,
      message: "Login successful",
      profile: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Registration Route
router.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  try {
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please enter all fields" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const user = new User({ username, email, password }); // ✅ Include username
    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
