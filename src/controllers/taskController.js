const Task = require("../models/Task");
const Project = require("../models/Project");

// GET ALL TASKS BY PROJECT
exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

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

    const project = await Project.findById(projectId).populate(
      "teamMembers.userId",
      "username email role"
    );

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    const members = project.teamMembers.map((m) => m.userId);

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// CREATE NEW TASK
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, project, deadline, tags } = req.body;

    if (!title || !project) {
      return res.status(400).json({
        success: false,
        message: "Title and project ID are required.",
      });
    }

    // ensure project exists
    const existingProject = await Project.findById(project);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    // 🔐 VALIDATE ASSIGNEE BELONGS TO PROJECT
    if (assignedTo) {
      const isMember = existingProject.teamMembers.some(
        (m) => m.userId.toString() === assignedTo
      );

      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not part of this project.",
        });
      }
    }

    // normalize tags
    let normalizedTags;
    if (Array.isArray(tags)) {
      normalizedTags = tags.map(t => t.trim()).filter(Boolean);
    } else if (typeof tags === "string") {
      normalizedTags = tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    const newTask = new Task({
      title,
      description,
      status: status || "backlog",
      assignedTo,
      project,
      deadline,
      tags: normalizedTags,
    });

    await newTask.save();

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

    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // 🔐 validate reassignment
    if (updates.assignedTo) {
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
    });
    res
      .status(200)
      .json({ success: true, message: "Task updated", data: updated });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


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
