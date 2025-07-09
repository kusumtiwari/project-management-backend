const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require("../utils/emailUtils");


exports.register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  console.log("Email user:", process.env.EMAIL_USER);
  console.log("Email pass set?", !!process.env.EMAIL_PASS);

  try {
    // Validation checks
    if (!username || !email || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter all fields" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isVerified) {
        const verificationToken = jwt.sign(
          { id: existingUser._id },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        // Optionally resend verification email here
        await sendVerificationEmail(existingUser, verificationToken);
        return res
          .status(400)
          .json({
            success: false,
            message: "User exists but not verified. Verification email resent.",
          });
      }
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }
    
    // Create unverified user
    const user = new User({
      username,
      email,
      password,
      isVerified: false, // <-- IMPORTANT
    });
    await user.save();

    // Generate a JWT token for verification (expires in 1 hour)
    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Send verification email with token
    await sendVerificationEmail(user, verificationToken);

    // Respond without token
    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User with this email does not exist",
        });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in.",
      });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      profile: {
        username: user.username,
        email: user.email,
        teams: user.teams,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// controllers/authController.js
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  console.log(token,'token')

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
};

