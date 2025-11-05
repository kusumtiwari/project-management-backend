const Task = require("../models/Task");
const Project = require("../models/Project");

exports.getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    // find tasks that belong to this project
    const query = { project: projectId };
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTasks = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        totalTasks,
        currentPage: page,
        totalPages: Math.ceil(totalTasks / limit),
        hasNextPage: page * limit < totalTasks,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE NEW TASK
exports.createTask = async (req, res) => {
  try {
    const { title, description, status, assignedTo, project, deadline, tags } = req.body;

    // basic validation
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

    // create new task
    // normalize tags
    let normalizedTags = undefined;
    if (Array.isArray(tags)) {
      normalizedTags = tags.filter(Boolean).map((t) => String(t).trim()).filter((t) => t.length > 0);
    } else if (typeof tags === 'string') {
      normalizedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    const newTask = new Task({
      title,
      description,
      status: status || 'backlog',
      assignedTo,
      project,
      deadline,
      ...(normalizedTags ? { tags: normalizedTags } : {}),
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

    const updated = await Task.findByIdAndUpdate(taskId, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.status(200).json({ success: true, message: "Task updated", data: updated });
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
