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
    const projects = await Project.find().populate("teamMembers", "name email");
    res.status(200).json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
