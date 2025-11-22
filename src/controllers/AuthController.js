const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require("../utils/emailUtils");
const TeamSetup = require('../models/TeamSetup')
const Role = require('../models/Role')
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
      isVerified: false, // email verification still required for self-signup
      isAdmin: true,
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

// Logout: clear auth cookie
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return res.status(200).json({ success: true, message: 'Logged out' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error' });
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

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie('token', token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      profile: {
        username: user.username,
        email: user.email,
        teams: user.teams,
        isAdmin: user.isAdmin,
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
      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };
      res.cookie('token', accessToken, cookieOptions);
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
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
    res.cookie('token', accessToken, cookieOptions);

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
// Create a team member directly (no email invite). Requires admin auth.
exports.createTeamMember = async (req, res) => {
  try {
    const { username, email, password, teamId: rawTeamId, roleId } = req.body;

    // Resolve teamId: allow omission if the admin has an existing team membership
    let teamId = rawTeamId;
    if (!teamId && req.user) {
      const adminUser = await User.findById(req.user.id);
      const firstTeam = adminUser?.teams?.[0]?.teamId;
      if (firstTeam) teamId = String(firstTeam);
    }

    // If still no teamId, fallback to the only available team in the system (if exactly one exists)
    if (!teamId) {
      const teams = await TeamSetup.find({}).select('_id');
      if (teams.length === 1) {
        teamId = String(teams[0]._id);
      }
    }

    if (!username || !email || !password || !teamId || !roleId) {
      return res.status(400).json({ success: false, message: 'username, email, password, teamId and roleId are required (no default team found)' });
    }

    // Only admins can create team members
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can create team members' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const team = await TeamSetup.findById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const newUser = new User({
      username,
      email,
      password,
      isVerified: true,
      isAdmin: false,
      teams: [{
        teamId: team._id,
        teamName: team.name,
        role: 'member',
        roleId: role._id,
        permissions: role.permissions,
        joinedAt: new Date()
      }],
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        teams: newUser.teams,
      },
    });
  } catch (err) {
    console.error('Create team member error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

