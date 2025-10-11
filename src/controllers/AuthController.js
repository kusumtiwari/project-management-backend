const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require("../utils/emailUtils");
const Invitation = require('../models/Invitation')
const bcrypt = require('bcryptjs')
// for user signup 
exports.register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
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

    console.log(req.body,'here')
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
// for user login 
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
// to verify the registered user 
exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    if (user.isVerified) {
      // Issue new access token
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      return res.status(200).json({
        success: true,
        message: "Email already verified",
        token: accessToken,
      });
    }

    user.isVerified = true;
    await user.save();

    // Issue token after verification
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token: accessToken,
    });
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
// to verify the invited team member
exports.verifyTeamMember = async (req, res) => {
  try{
      const token = req.query.token;

    if (!token) {
      return res.status(400).json({ message: "Token is required in query." });
    }
    const payload = jwt.verify(token, process.env.INVITE_SECRET);
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    if (invitation.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invitation has expired." });
    }

    if (invitation.used) {
      return res.status(400).json({ message: "Invitation already used." });
    }
    return res.status(200).json({
      success: true,
      email: payload.email,
      message: "Valid invitation.",
    });
  } catch (err) {
    console.error("Invitation verification error:", err);
    return res.status(400).json({ message: "Invalid or expired token." });
  }
  }

exports.registerInvitedTeamMember = async (req, res) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const payload = jwt.verify(token, process.env.INVITE_SECRET);
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    if (invitation.used) {
      return res.status(400).json({ message: "Invitation already used." });
    }

    if (invitation.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invitation expired." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: payload.email,
      password: hashedPassword,
      teams: [
        {
          teamId: invitation.teamId,
          role: invitation.role || "member", // default to 'member' if not set
          joinedAt: new Date(),
        },
      ],
    });

    await newUser.save();

    // Mark invitation as used
    invitation.used = true;
    await invitation.save();

    // Generate login token
    const loginToken = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const team = await Team.findById(invitation.teamId);

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token: loginToken,
      profile: {
        username: newUser.name,
        email: newUser.email,
        teams: [
          {
            teamId: team._id,
            teamName: team.name,
            role: invitation.role,
            joinedAt: newUser.teams[0].joinedAt,
          },
        ],
      },
    });
  } catch (err) {
    console.error("Register invited member error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

