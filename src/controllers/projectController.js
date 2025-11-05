const Project = require("../models/Project");

exports.createProject = async (req, res) => {
  try {
    const { name, teamMembers, status, deadline, description } = req.body;

    const newProject = new Project({
      name,
      teamMembers,
      status,
      deadline,
      description,
    });

    await newProject.save();
    res.status(201).json({ success: true, data: newProject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    // extract page and limit from query string (default: page 1, limit 10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // calculate skip value
    const skip = (page - 1) * limit;

    // find projects with pagination
    const projects = await Project.find()
      .populate("teamMembers", "name email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // optional: sort newest first

    // get total count for pagination info
    const totalProjects = await Project.countDocuments();

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
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get a single project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate("teamMembers", "name email");
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update a project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await Project.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, message: "Project updated", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete a project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    res.status(200).json({ success: true, message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};