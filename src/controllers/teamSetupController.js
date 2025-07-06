const TeamSetup = require("../models/TeamSetup");
const User = require("../models/User")
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
