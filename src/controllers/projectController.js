const Project = require("../models/Project");
const User = require("../models/User");
const TeamSetup = require("../models/TeamSetup");

// Helper function to check if user has permission
const hasPermission = (user, teamId, permissionNeeded) => {
  // SuperAdmins have all permissions
  if (user.isSuperAdmin) return true;

  // Admins have permissions within their teams
  if (user.isAdmin) {
    const teamEntry = user.teams.find(
      (t) => t.teamId.toString() === teamId.toString()
    );
    return !!teamEntry; // Admin must be part of the team
  }

  // Members need specific permissions
  const teamEntry = user.teams.find(
    (t) => t.teamId.toString() === teamId.toString()
  );
  if (!teamEntry) return false;

  return (
    teamEntry.permissions.includes(permissionNeeded) ||
    teamEntry.role === "admin"
  );
};

// Create a project with multiple teams and members
exports.createProject = async (req, res) => {
  try {
    const { name, teams, status, deadline, description, priority } = req.body;

    // Validate required fields
    if (!name || !teams || !Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project name and at least one team are required",
      });
    }

    // Only Admins or SuperAdmins can create
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only administrators can create projects",
      });
    }

    // Validate all team IDs exist
    const validTeams = await TeamSetup.find({ _id: { $in: teams } });
    if (validTeams.length !== teams.length) {
      return res.status(404).json({
        success: false,
        message: "One or more teams not found",
      });
    }

    // Check permission in at least one team
    const hasPermissionInAnyTeam = teams.some((teamId) =>
      hasPermission(req.user, teamId, "create_project")
    );
    if (!hasPermissionInAnyTeam) {
      return res.status(403).json({
        success: false,
        message:
          "You don't have permission to create projects in any of these teams",
      });
    }

    // Format teams for Project schema
    const formattedTeams = teams.map((teamId) => ({
      teamId,
      addedAt: new Date(),
    }));

    // Create new project
    const newProject = new Project({
      name,
      teams: formattedTeams,
      teamId: teams[0], // backward compatibility for single team
      status: status || "Not Started",
      priority: priority || "medium",
      deadline,
      description,
      createdBy: req.user._id,
      adminId: req.user.isSuperAdmin
        ? req.body.adminId || req.user._id
        : req.user._id,
    });

    await newProject.save();

    // Populate related fields
    await newProject.populate([
      { path: "teams.teamId", select: "name" },
      { path: "createdBy", select: "username email" },
      { path: "adminId", select: "username email" },
    ]);

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

exports.getAllProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { teamId } = req.query;

    let query = {};

    // 🔐 ROLE BASED SCOPING
    if (req.user.isSuperAdmin) {
      // no restriction
    } 
    else if (req.user.isAdmin) {
      query.adminId = req.user._id;
    } 
    else {
      // 👤 MEMBER → only projects of teams they belong to
      const userTeamIds = req.user.teams.map(t => t.teamId);
      query["teams.teamId"] = { $in: userTeamIds };
    }

    // 🔍 OPTIONAL TEAM FILTER
    if (teamId) {
      const userTeamIds = req.user.teams.map(t => t.teamId.toString());

      if (!req.user.isSuperAdmin && !userTeamIds.includes(teamId)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this team",
        });
      }

      query["teams.teamId"] = teamId;
    }

    const projects = await Project.find(query)
      .populate("teams.teamId", "name")
      .populate("adminId", "username email")
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
      },
    });
  } catch (err) {
    console.error("Get projects error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get a single project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id)
      .populate("teamMembers.userId", "username email")
      .populate("teamId", "name")
      .populate("adminId", "username email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // CRITICAL: Admin ownership verification to prevent data leakage
    // SuperAdmins have full access to all projects
    if (!req.user.isSuperAdmin) {
      // Admins can access their own projects OR projects without adminId (backward compat)
      if (req.user.isAdmin) {
        const adminIdMatches =
          project.adminId &&
          project.adminId.toString() === req.user._id.toString();
        const noAdminId = !project.adminId;

        if (!adminIdMatches && !noAdminId) {
          return res.status(403).json({
            success: false,
            message:
              "You don't have access to this project (admin ownership required)",
          });
        }
      } else {
        // Members: Check if they are assigned to this project
        const isAssignedToProject = project.teamMembers.some(
          (member) => member.userId.toString() === req.user._id.toString()
        );

        if (!isAssignedToProject) {
          return res.status(403).json({
            success: false,
            message: "You are not assigned to this project",
          });
        }
      }
    }

    res.status(200).json({ success: true, data: project });
  } catch (err) {
    console.error("Get project by ID error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a project (including reassigning teams and members)
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const project = await Project.findById(id).populate("teams.teamId");
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // CRITICAL: Admin ownership verification to prevent unauthorized edits
    if (!req.user.isSuperAdmin) {
      // Admins can edit their own projects OR projects without adminId (backward compat)
      if (req.user.isAdmin) {
        const adminIdMatches =
          project.adminId &&
          project.adminId.toString() === req.user._id.toString();
        const noAdminId = !project.adminId;

        if (!adminIdMatches && !noAdminId) {
          return res.status(403).json({
            success: false,
            message:
              "You don't have permission to edit this project (admin ownership required)",
          });
        }
      } else {
        // Members cannot edit projects
        return res.status(403).json({
          success: false,
          message: "Members cannot edit projects",
        });
      }
    }

    // Check permission - user must have edit permission in at least one of the project teams
    const projectTeamIds = project.teams.map((t) => t.teamId._id.toString());
    const hasEditPermission =
      projectTeamIds.some((teamId) =>
        hasPermission(req.user, teamId, "edit_project")
      ) || project.createdBy.toString() === req.user._id.toString();

    if (!hasEditPermission && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to edit this project",
      });
    }

    // Handle teams update
    if (updates.teams && Array.isArray(updates.teams)) {
      const teamIds = updates.teams.map((t) =>
        typeof t === "string" ? t : t.teamId
      );
      const validTeams = await TeamSetup.find({ _id: { $in: teamIds } });

      if (validTeams.length !== teamIds.length) {
        return res.status(404).json({
          success: false,
          message: "One or more teams not found",
        });
      }

      updates.teams = teamIds.map((teamId) => ({
        teamId,
        addedAt: new Date(),
      }));

      // Update teamId for backward compatibility
      updates.teamId = teamIds[0];
    }

    // Handle team members update
    if (updates.teamMembers && Array.isArray(updates.teamMembers)) {
      const memberUserIds = updates.teamMembers.map((tm) => tm.userId || tm);
      const availableTeamIds = updates.teams
        ? updates.teams.map((t) => t.teamId)
        : projectTeamIds;

      // Validate team members belong to project teams
      const users = await User.find({
        _id: { $in: memberUserIds },
        "teams.teamId": { $in: availableTeamIds },
      });

      // Format team members with proper structure
      updates.teamMembers = updates.teamMembers.map((member) => {
        const userId = member.userId || member;
        const user = users.find((u) => u._id.toString() === userId.toString());
        const userTeam = user?.teams.find((t) =>
          availableTeamIds.includes(t.teamId.toString())
        );

        return {
          userId,
          teamId: member.teamId || userTeam?.teamId || availableTeamIds[0],
          role: member.role || "member",
          assignedAt: new Date(),
        };
      });
    }

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.createdBy;
    delete updates.createdAt;
    // CRITICAL: Never allow changing adminId (ownership transfer requires special endpoint)
    delete updates.adminId;

    const updated = await Project.findByIdAndUpdate(id, updates, {
      new: true,
    }).populate([
      { path: "teamMembers.userId", select: "username email" },
      { path: "teams.teamId", select: "name" },
      { path: "createdBy", select: "username email" },
      { path: "adminId", select: "username email" },
    ]);

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

    // CRITICAL: Admin ownership verification to prevent unauthorized deletion
    // Only the owning admin or superadmin can delete a project
    if (!req.user.isSuperAdmin) {
      if (req.user.isAdmin) {
        const adminIdMatches =
          project.adminId &&
          project.adminId.toString() === req.user._id.toString();
        const noAdminId = !project.adminId;

        if (!adminIdMatches && !noAdminId) {
          return res.status(403).json({
            success: false,
            message:
              "You don't have permission to delete this project (admin ownership required)",
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: "Members cannot delete projects",
        });
      }
    }

    // Check permission - user must have delete permission or be the creator
    const projectTeamIds = project.teams?.map((t) => t.teamId) || [
      project.teamId,
    ];
    const hasDeletePermission =
      projectTeamIds.some((teamId) =>
        hasPermission(req.user, teamId, "delete_project")
      ) || project.createdBy?.toString() === req.user._id.toString();

    if (!hasDeletePermission && !req.user.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this project",
      });
    }

    // Also delete all tasks associated with this project
    const Task = require("../models/Task");
    await Task.deleteMany({ project: id });

    await Project.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Project and associated tasks deleted successfully",
    });
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate("teams.teamId", "name")
      .populate("teamMembers.userId", "username email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // 🔐 ACCESS CONTROL (TEAM-BASED)
    if (!req.user.isSuperAdmin) {
      const projectTeamIds = project.teams.map(t =>
        t.teamId._id.toString()
      );

      const userTeamIds = req.user.teams.map(t =>
        t.teamId.toString()
      );

      const hasTeamAccess = projectTeamIds.some(teamId =>
        userTeamIds.includes(teamId)
      );

      if (!hasTeamAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this project",
        });
      }
    }

    // ✅ FORMAT MEMBERS
    const members = (project.teamMembers || []).map(tm => ({
      _id: tm.userId._id,
      username: tm.userId.username,
      email: tm.userId.email,
      role: tm.role,
      teamId: tm.teamId,
      assignedAt: tm.assignedAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        projectId: project._id,
        projectName: project.name,
        teams: project.teams.map(t => ({
          _id: t.teamId._id,
          name: t.teamId.name,
        })),
        members,
      },
    });
  } catch (err) {
    console.error("Get project members error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
