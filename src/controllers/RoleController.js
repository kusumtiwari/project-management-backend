const Role = require("../models/Role");
const User = require("../models/User");

// ✅ 1. Get all available permissions (static list)
exports.getAllPermissions = (req, res) => {
  const permissions = [
    "view_project",
    "edit_project",
    "create_project",
    "delete_project",
    "view_role",
    "edit_role",
    "delete_role",
    "create_task",
    "edit_task",
    "delete_task",
  ];

  res.status(200).json({ success: true, permissions });
};

// 5. Update a role (name and/or permissions)
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    if (roleName) role.roleName = roleName;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await role.save();
    return res.status(200).json({ success: true, data: role });
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Delete a role
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    await role.deleteOne();
    return res.status(200).json({ success: true, message: 'Role deleted' });
  } catch (err) {
    console.error('Delete role error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Create a new role
exports.createRole = async (req, res) => {
  try {
    const { roleName, permissions } = req.body;

    if (!roleName || !permissions || !permissions.length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Role name and permissions are required.",
        });
    }

    const roleExists = await Role.findOne({ roleName });
    if (roleExists) {
      return res
        .status(400)
        .json({ success: false, message: "Role name already exists." });
    }

    const newRole = new Role({
      roleName,
      permissions,
    });

    await newRole.save();
    res.status(201).json({ success: true, data: newRole });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//  3. Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Assign a role to a team member (by userId or email) for a specific team
exports.assignRoleToMember = async (req, res) => {
  try {
    const { userId, email, teamId, roleId } = req.body;

    if ((!userId && !email) || !teamId || !roleId) {
      return res.status(400).json({ success: false, message: "userId or email, teamId and roleId are required" });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const user = await User.findOne(userId ? { _id: userId } : { email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const teamEntry = user.teams.find((t) => String(t.teamId) === String(teamId));
    if (!teamEntry) {
      return res.status(404).json({ success: false, message: "User is not part of this team" });
    }

    teamEntry.roleId = role._id;
    teamEntry.permissions = role.permissions;
    if (teamEntry.role === 'member' || teamEntry.role === 'admin') {
      // keep legacy role field as member (RBAC now via permissions)
      teamEntry.role = 'member';
    }

    await user.save();

    return res.status(200).json({ success: true, message: 'Role assigned successfully', data: {
      userId: user._id,
      teamId,
      roleId: role._id,
      permissions: role.permissions,
    }});
  } catch (err) {
    console.error('Assign role error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
