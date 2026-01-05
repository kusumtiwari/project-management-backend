const Project = require("../models/Project");
const User = require("../models/User");
const TeamSetup = require("../models/TeamSetup");

// Helper function to check if user has permission
const hasPermission = (user, teamId, permissionNeeded) => {
  if (user.isAdmin) return true;

  const teamEntry = user.teams.find(
    (t) => t.teamId.toString() === teamId.toString()
  );
  if (!teamEntry) return false;

  return (
    teamEntry.permissions.includes(permissionNeeded) ||
    teamEntry.role === "admin"
  );
};

// Create a project with team members assigned
exports.createProject = async (req, res) => {
  try {
    const { name, teamId, teamMembers, status, deadline, description } =
      req.body;

    // Validate required fields
    if (!name || !teamId) {
      return res.status(400).json({
        success: false,
        message: "Project name and teamId are required",
      });
    }

    // Check if team exists
    const team = await TeamSetup.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    // Check if user has permission to create project in this team
    if (!hasPermission(req.user, teamId, "create_project")) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create projects in this team",
      });
    }

    // Format and validate team members if provided
    let formattedMembers = [];
    if (teamMembers && teamMembers.length > 0) {
      // Validate team members belong to the team
      const users = await User.find({
        _id: { $in: teamMembers },
        "teams.teamId": teamId,
      });

      if (users.length !== teamMembers.length) {
        return res.status(400).json({
          success: false,
          message: "Some team members are not part of this team",
        });
      }

      // Format with assignment timestamp
      formattedMembers = teamMembers.map((userId) => ({
        userId,
        assignedAt: new Date(),
      }));
    }

    const newProject = new Project({
      name,
      teamId,
      teamMembers: formattedMembers,
      status: status || "planning",
      deadline,
      description,
    });

    await newProject.save();

    // Populate only existing fields
    await newProject.populate("teamMembers.userId", "username email");
    await newProject.populate("teamId", "name");

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: newProject,
    });
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all projects (filtered by team)
exports.getAllProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { teamId } = req.query;

    let query = {};

    // If teamId is provided, filter by team
    if (teamId) {
      // Check if user is part of this team
      const userInTeam = req.user.teams.find(
        (t) => t.teamId.toString() === teamId
      );
      if (!userInTeam && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this team's projects",
        });
      }
      query.teamId = teamId;
    } else {
      // Show projects from all teams user belongs to
      if (!req.user.isAdmin) {
        const userTeamIds = req.user.teams.map((t) => t.teamId);
        query.teamId = { $in: userTeamIds };
      }
    }

    const projects = await Project.find(query)
      .populate("teamMembers.userId", "username email")
      .populate("teamId", "name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalProjects = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        totalProjects,
        currentPage: page,
        totalPages: Math.ceil(totalProjects / limit),
        hasNextPage: page * limit < totalProjects,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Get all projects error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get a single project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate("teamMembers.userId", "username email")
      .populate("teamId", "name");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user has access to this project
    const userInTeam = req.user.teams.find(
      (t) => t.teamId.toString() === project.teamId._id.toString()
    );

    if (!userInTeam && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this project",
      });
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error("Get project by ID error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a project (including reassigning team members)
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permission
    if (!hasPermission(req.user, project.teamId, "edit_project")) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to edit this project",
      });
    }

    // If updating team members, validate them
    if (updates.teamMembers && Array.isArray(updates.teamMembers)) {
      const users = await User.find({
        _id: { $in: updates.teamMembers },
        "teams.teamId": project.teamId,
      });

      if (users.length !== updates.teamMembers.length) {
        return res.status(400).json({
          success: false,
          message: "Some team members are not part of this team",
        });
      }

      // Format with timestamp
      updates.teamMembers = updates.teamMembers.map((userId) => ({
        userId,
        assignedAt: new Date(),
      }));
    }

    // Don't allow changing teamId
    delete updates.teamId;

    const updated = await Project.findByIdAndUpdate(id, updates, { new: true })
      .populate("teamMembers.userId", "username email")
      .populate("teamId", "name");

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check permission
    if (!hasPermission(req.user, project.teamId, "delete_project")) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this project",
      });
    }

    await Project.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
