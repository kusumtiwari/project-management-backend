const User = require("../models/User");
const Invitation = require("../models/Invitation");
const generateInvitationToken = require("../utils/generateInvitationToken");
const { sendInvitationForTeamMember } = require("../utils/emailUtils");

const sendTeamInvitation = async (req, res) => {
  try {
    console.log(req.body, 'team invitation request body here..');
    console.log(req.user,'the user who requested')
    const { email } = req.body;
    const invitedBy = req.user._id;
    // Check if user is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered." });
    }

    const inviter = await User.findById(invitedBy);
    if (!inviter) {
      return res.status(404).json({ message: "Inviter not found." });
    }

    // Generate secure invitation token
    const token = generateInvitationToken({ email, invitedBy });

    // Save to DB
    await Invitation.create({
      email,
      invitedBy,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    // Send email
    await sendInvitationForTeamMember({
      to: email,
      token,
      invitedByUsername: inviter.username || inviter.email,
    });

    return res.status(200).json({ message: "Invitation sent successfully." });
  } catch (err) {
    console.error("Invitation error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

module.exports = { sendTeamInvitation };
