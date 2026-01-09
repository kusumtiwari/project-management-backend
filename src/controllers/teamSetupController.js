const TeamSetup = require("../models/TeamSetup");
const User = require("../models/User");

exports.createTeamSetup = async (req, res) => {
  try {
    const { name } = req.body;

    // Only admins and superadmins can create teams
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can create teams",
      });
    }

    const existingTeam = await TeamSetup.findOne({
      name
    });

    if(existingTeam){
      return res.status(400).json({
        success: false,
        message: "A team with this name already exists.",
      });
    }

    const newTeam = new TeamSetup({
      name,
      adminId: req.user.isSuperAdmin ? req.body.adminId || req.user._id : req.user._id,
      createdBy: req.user._id
    });

    await newTeam.save();
    await req.user.addTeam(newTeam._id, newTeam.name, "admin");

    // Refresh user data
    const updatedUser = await User.findById(req.user._id);

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      team: {
        _id: newTeam._id,
        name: newTeam.name,
        adminId: newTeam.adminId
      },
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

    // CRITICAL: Verify team belongs to user's admin scope
    if (!req.user.isSuperAdmin) {
      if (req.user.isAdmin) {
        // Check if team belongs to this admin
        const teamAdminId = team.adminId ? team.adminId.toString() : team.createdBy?.toString();
        if (teamAdminId && teamAdminId !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: "You don't have access to this team"
          });
        }
      } else {
        // Members can only list teams they belong to
        const userInTeam = req.user.teams.some(
          t => t.teamId.toString() === teamId
        );
        if (!userInTeam) {
          return res.status(403).json({
            success: false,
            message: "You don't have access to this team"
          });
        }
      }
    }

    const users = await User.find({ 'teams.teamId': teamId })
      .select('_id username email teams')
      .populate('teams.roleId');

    // Map users to only include their role/permissions for THIS specific team
    const members = users.map(user => {
      const teamEntry = user.teams.find(t => t.teamId.toString() === teamId);
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: teamEntry.roleId ? teamEntry.roleId.roleName : teamEntry.role,
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
    let query = {};

    // CRITICAL: Admin scoping to prevent teams from other admins
    if (!req.user.isSuperAdmin) {
      if (req.user.isAdmin) {
        // Admins see their own teams OR teams without adminId (backward compat)
        query.$or = [
          { adminId: req.user._id },
          { adminId: { $exists: false } },
          { adminId: null }
        ];
      } else {
        // Members only see teams they belong to
        const userTeamIds = req.user.teams.map(t => t.teamId);
        query._id = { $in: userTeamIds };
      }
    }

    const teams = await TeamSetup.find(query).select('_id name adminId createdBy');
    return res.status(200).json({ success: true, data: teams });
  } catch (err) {
    console.error('List teams error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.updateTeamMember = async (req, res) => {
  try {
    const { memberId, teamId: paramsTeamId } = req.params;
    const { username, email, roleId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    // Only admins and superadmins can update team members
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can update team members",
      });
    }

    // Get team from params or body
    const teamId = paramsTeamId || req.body.teamId;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "teamId is required",
      });
    }

    // CRITICAL: Verify team belongs to user's admin scope
    const team = await TeamSetup.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (!req.user.isSuperAdmin) {
      const teamAdminId = team.adminId ? team.adminId.toString() : team.createdBy?.toString();
      if (teamAdminId && teamAdminId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to update members in this team"
        });
      }
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
        (t) => t.teamId.toString() === teamId
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
    const { memberId, teamId: paramsTeamId } = req.params;
    let { teamId } = req.body;

    // Get team from params if not in body
    if (!teamId) teamId = paramsTeamId;

    if (!memberId || !teamId) {
      return res.status(400).json({
        success: false,
        message: "memberId and teamId are required",
      });
    }

    // Only admins and superadmins can remove team members
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can remove team members",
      });
    }

    // CRITICAL: Verify team belongs to user's admin scope
    const team = await TeamSetup.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (!req.user.isSuperAdmin) {
      const teamAdminId = team.adminId ? team.adminId.toString() : team.createdBy?.toString();
      if (teamAdminId && teamAdminId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to remove members from this team"
        });
      }
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
