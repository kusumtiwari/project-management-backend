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

    const members = await User.find({ 'teams.teamId': teamId }).select('_id username email teams');
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
