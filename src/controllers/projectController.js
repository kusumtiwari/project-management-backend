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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // 🔓 Admin can see all projects
    if (req.user.isAdmin) {
      query = {};
    }
    // 🔑 Normal users see only what they should
    else {
      query = {
        $or: [
          { createdBy: req.user._id }, // user created it
          { teamMembers: req.user._id }, // user is a team member
          { permissions: req.user._id }, // user explicitly has permission (optional)
        ],
      };
    }

    const projects = await Project.find(query)
      .populate("teamMembers", "name email")
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