const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const { sendTaskNotificationEmail } = require("../utils/emailUtils");

// GET ALL TASKS BY PROJECT
exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;

    // Check if the project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // For members, only show tasks if they're part of the project
    if (!user.isSuperAdmin && !user.isAdmin) {
      const isMember = project.teamMembers.some(
        member => member.userId.toString() === user._id.toString()
      );
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to this project"
        });
      }

      // For members, only return tasks assigned to them or show all project tasks based on role
      const tasks = await Task.find({ 
        project: projectId,
        $or: [
          { assignedTo: user._id }, // Tasks assigned to them
          { assignedTo: { $exists: false } }, // Unassigned tasks
          { assignedTo: null } // Explicitly unassigned
        ]
      }).populate("assignedTo", "username email");

      return res.status(200).json({
        success: true,
        data: tasks,
      });
    }

    // For admins and superadmins, show all tasks
    const tasks = await Task.find({ project: projectId }).populate(
      "assignedTo",
      "username email"
    );

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;

    const project = await Project.findById(projectId)
      .populate('teamMembers.userId', 'username email')
      .populate('teams.teamId', 'name');

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Check if user has access to this project
    const projectTeamIds = project.teams?.map(t => t.teamId._id.toString()) || [project.teamId?.toString()];
    const hasAccess = user.isSuperAdmin || 
      user.isAdmin || 
      projectTeamIds.some(teamId => 
        user.teams.some(ut => ut.teamId.toString() === teamId)
      ) ||
      project.teamMembers.some(tm => tm.userId._id.toString() === user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this project"
      });
    }

    // Return formatted members for dropdown
    const members = project.teamMembers.map((member) => ({
      _id: member.userId._id,
      username: member.userId.username,
      email: member.userId.email,
      role: member.role,
      value: member.userId._id, // For dropdown value
      label: `${member.userId.username} (${member.userId.email})` // For dropdown label
    }));

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (err) {
    console.error('Get project members error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// CREATE NEW TASK
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, project, deadline, tags, priority } = req.body;
    const user = req.user;

    if (!title || !project) {
      return res.status(400).json({
        success: false,
        message: "Title and project ID are required.",
      });
    }

    // ensure project exists and populate necessary fields
    const existingProject = await Project.findById(project)
      .populate('teams.teamId')
      .populate('teamMembers.userId');
      
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // Check if user has permission to create tasks
    // Permission inheritance: if user can access project, they can create tasks
    const projectTeamIds = existingProject.teams?.map(t => t.teamId._id.toString()) || [existingProject.teamId?.toString()];
    const canCreateTask = user.isSuperAdmin || 
      user.isAdmin ||
      projectTeamIds.some(teamId => {
        const userTeam = user.teams.find(ut => ut.teamId.toString() === teamId);
        return userTeam && (
          userTeam.permissions.includes('create_task') ||
          userTeam.permissions.includes('edit_project') || // Project permission implies task permission
          userTeam.role === 'admin'
        );
      }) ||
      existingProject.teamMembers.some(tm => tm.userId._id.toString() === user._id.toString());

    if (!canCreateTask) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to create tasks in this project.",
      });
    }

    // 🔐 VALIDATE ASSIGNEE BELONGS TO PROJECT
    if (assignedTo) {
      const isMember = existingProject.teamMembers.some(
        (m) => m.userId._id.toString() === assignedTo
      );

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not part of this project.",
        });
      }
    }

    // normalize tags
    let normalizedTags = [];
    if (Array.isArray(tags)) {
      normalizedTags = tags.map(t => t.trim()).filter(Boolean);
    } else if (typeof tags === "string") {
      normalizedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    const newTask = new Task({
      title,
      description,
      status: status || "backlog",
      assignedTo: assignedTo || null,
      project,
      deadline,
      tags: normalizedTags,
      priority: priority || "medium",
      createdBy: user._id,
    });

    await newTask.save();
    
    // Populate the created task
    await newTask.populate([
      { path: 'assignedTo', select: 'username email' },
      { path: 'project', select: 'name' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: newTask,
    });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// UPDATE TASK (title, description, status, assignedTo, deadline, tags)
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;
    const user = req.user;

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Access control: Members can only update tasks assigned to them and only certain fields
    if (!user.isSuperAdmin && !user.isAdmin) {
      // Check if user is assigned to this task or is part of the project
      const isAssignedToTask = task.assignedTo && task.assignedTo.toString() === user._id.toString();
      const isProjectMember = task.project.teamMembers.some(
        member => member.userId.toString() === user._id.toString()
      );

      if (!isAssignedToTask && !isProjectMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only update tasks assigned to you"
        });
      }

      // Members can only update status and add comments (if we had comments)
      const allowedUpdates = ['status'];
      const memberUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          memberUpdates[key] = updates[key];
        }
      });

      if (Object.keys(memberUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "Members can only update task status"
        });
      }

      updates = memberUpdates;
    }

    // Store original status for notification
    const originalStatus = task.status;
    const originalAssignee = task.assignedTo;

    // 🔐 validate reassignment (only for admins/superadmins)
    if (updates.assignedTo && (user.isAdmin || user.isSuperAdmin)) {
      const project = await Project.findById(task.project._id);
      const isMember = project.teamMembers.some(
        (m) => m.userId.toString() === updates.assignedTo
      );

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not part of this project.",
        });
      }
    }

    const updated = await Task.findByIdAndUpdate(taskId, updates, {
      new: true,
    }).populate("assignedTo", "username email").populate("project", "name");

    // Send notifications to admins when task status is updated by member
    if (originalStatus !== updated.status && !user.isAdmin && !user.isSuperAdmin) {
      try {
        await sendTaskStatusNotificationToAdmins(updated, originalStatus, user);
      } catch (notifError) {
        console.error('Notification error:', notifError);
        // Don't fail the task update if notification fails
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Task updated", data: updated });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper function to notify admins about task status changes
async function sendTaskStatusNotificationToAdmins(task, originalStatus, updatedBy) {
  try {
    // Find all users who are admins in the same team as the project
    const project = await Project.findById(task.project._id).populate('teamId');
    
    // Find admin users who have this team in their teams array
    const adminUsers = await User.find({
      'teams.teamId': project.teamId._id,
      'teams.role': 'admin',
      isAdmin: true
    });

    // Also notify superadmins
    const superAdmins = await User.find({ isSuperAdmin: true });
    const allAdmins = [...adminUsers, ...superAdmins];

    // Send email notifications (you'll need to implement this)
    for (const admin of allAdmins) {
      try {
        // This is a placeholder - you'll need to implement sendTaskNotificationEmail
        console.log(`Notifying admin ${admin.email} about task status change:`);
        console.log(`Task: ${task.title}`);
        console.log(`Status changed from ${originalStatus} to ${task.status}`);
        console.log(`Changed by: ${updatedBy.username}`);
        
        // Uncomment when you implement the email function
        // await sendTaskNotificationEmail(admin, task, originalStatus, updatedBy);
      } catch (emailError) {
        console.error(`Failed to notify admin ${admin.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error('Error in sendTaskStatusNotificationToAdmins:', error);
  }
}


// DELETE TASK
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const deleted = await Task.findByIdAndDelete(taskId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.status(200).json({ success: true, message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
