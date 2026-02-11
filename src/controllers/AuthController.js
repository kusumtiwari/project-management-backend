const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require("../utils/emailUtils");
const TeamSetup = require('../models/TeamSetup');
const Role = require('../models/Role');

/* =========================
   REGISTER → ADMIN ONLY
========================= */
exports.register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  try {
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.isVerified) {
        const verificationToken = jwt.sign(
          { id: existingUser._id },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );
        await sendVerificationEmail(existingUser, verificationToken);
        return res.status(400).json({
          success: false,
          message: "User exists but not verified. Verification email resent.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // ✅ ALWAYS CREATE ADMIN (NOT SUPERADMIN)
    const user = new User({
      username,
      email,
      password,
      isVerified: false,
      userType: "admin",
      isAdmin: true,
      isSuperAdmin: false,
      createdBy: null,
      hasCompletedSetup: false,
    });

    await user.save();

    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    await sendVerificationEmail(user, verificationToken);

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
    });

  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   LOGIN
========================= */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before login",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      profile: {
        username: user.username,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        teams: user.teams,
        hasCompletedSetup: user.hasCompletedSetup,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   VERIFY EMAIL
========================= */
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid token",
      });
    }

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token: accessToken,
    });

  } catch (err) {
    console.error(err);
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

/* =========================
   LOGOUT
========================= */
exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/* =========================
   CREATE TEAM MEMBER (ADMIN ONLY)
========================= */
exports.createTeamMember = async (req, res) => {
  try {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can create team members",
      });
    }

    const { username, email, password, teamId, roleId } = req.body;

    if (!username || !email || !password || !teamId || !roleId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const team = await TeamSetup.findById(teamId);
    const role = await Role.findById(roleId);

    if (!team || !role) {
      return res.status(404).json({
        success: false,
        message: "Team or role not found",
      });
    }

    const newUser = new User({
      username,
      email,
      password,
      isVerified: true,
      userType: "member",
      isAdmin: false,
      isSuperAdmin: false,
      createdBy: req.user._id,
      hasCompletedSetup: true,
      teams: [{
        teamId: team._id,
        teamName: team.name,
        role: "member",
        roleId: role._id,
        permissions: role.permissions,
        joinedAt: new Date(),
      }],
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "Team member created successfully",
    });

  } catch (err) {
    console.error("Create team member error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
