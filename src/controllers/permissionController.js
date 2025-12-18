const Permission = require("../models/Permission");

// Get all permissions
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().lean();
    res.status(200).json({ success: true, data: permissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Create a new permission
exports.createPermission = async (req, res) => {
  try {
    const { name, label } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Permission name is required" });
    }

    const exists = await Permission.findOne({ name });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Permission already exists" });
    }

    const permission = await Permission.create({ name, label });

    res.status(201).json({ success: true, data: permission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
