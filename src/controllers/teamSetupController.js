const TeamSetup = require("../models/TeamSetup");
const User = require("../models/User");

exports.createTeamSetup = async (req, res) => {
  try {
    const { name } = req.body;
    const existingTeam = await TeamSetup.findOne({
      name
    })
    if(existingTeam){
      return res.status(400).json({
        success: false,
        message: "A team with this name already exists.",
      });
    }
    const newTeam = new TeamSetup({ name });
    await newTeam.save();
    await req.user.addTeam(newTeam._id, newTeam.name, "admin");

    // Refresh user data
    const updatedUser = await User.findById(req.user._id);

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      profile: {
        username: updatedUser.username,
        email: updatedUser.email,
        teams: updatedUser.teams,
      },
    });
  } catch (err) {
    console.error("Team setup error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// List members of a team

exports.listTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    if (!teamId) return res.status(400).json({ success: false, message: 'teamId is required' });

    const team = await TeamSetup.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const users = await User.find({ 'teams.teamId': teamId })
      .select('_id username email teams')
      .populate('teams.roleId'); // Populate the roleId to get role details
    
    // Map users to only include their role/permissions for THIS specific team
    const members = users.map(user => {
      const teamEntry = user.teams.find(t => t.teamId.toString() === teamId);
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: teamEntry.roleId ? teamEntry.roleId.roleName : teamEntry.role, // Get roleName from populated roleId
        roleId: teamEntry.roleId,
        permissions: teamEntry.permissions,
        joinedAt: teamEntry.joinedAt
      };
    });

    return res.status(200).json({ success: true, data: members });
  } catch (err) {
    console.error('List team members error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
// List all teams
exports.listTeams = async (req, res) => {
  try {
    const teams = await TeamSetup.find({}).select('_id name');
    return res.status(200).json({ success: true, data: teams });
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.updateTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { username, email, roleId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update basic fields
    if (username) user.username = username;
    if (email) user.email = email;

    // Update role inside teams array
    if (roleId) {
      const teamIndex = user.teams.findIndex(
        (t) => t.teamId.toString() === req.params.teamId
      );

      if (teamIndex !== -1) {
        user.teams[teamIndex].role = roleId;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Member updated successfully",
    });
  } catch (err) {
    console.error("Update team member error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.deleteTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { teamId } = req.body;

    if (!memberId || !teamId) {
      return res.status(400).json({
        success: false,
        message: "memberId and teamId are required",
      });
    }

    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Remove team from user's teams array
    user.teams = user.teams.filter((t) => t.teamId.toString() !== teamId);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Member removed from team",
    });
  } catch (err) {
    console.error("Delete team member error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
