const User = require('../models/User');
const TeamSetup = require('../models/TeamSetup');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require("../utils/emailUtils");

// Create Admin by SuperAdmin
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if the requester is a superadmin
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super administrators can create admins' 
      });
    }

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new admin
    const newAdmin = new User({
      username,
      email,
      password,
      isVerified: true, // Admins created by superadmin are auto-verified
      userType: 'admin',
      isAdmin: true,
      isSuperAdmin: false,
      createdBy: req.user._id,
      hasCompletedSetup: false
    });

    await newAdmin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        userType: newAdmin.userType,
        createdBy: newAdmin.createdBy,
        createdAt: newAdmin.createdAt
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating admin' 
    });
  }
};

// Get All Admins
exports.getAllAdmins = async (req, res) => {
  try {
    // Check if the requester is a superadmin
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super administrators can view all admins' 
      });
    }

    const admins = await User.find({ 
      userType: 'admin',
      isAdmin: true 
    })
    .select('-password')
    .populate('createdBy', 'username email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      admins: admins,
      count: admins.length
    });

  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching admins' 
    });
  }
};

// Delete Admin (and cascade delete their teams, projects, tasks)
exports.deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Check if the requester is a superadmin
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super administrators can delete admins' 
      });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (!admin.isAdmin || admin.isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete non-admin users or super administrators'
      });
    }

    // Find all teams where this admin is involved
    const adminTeams = admin.teams.map(team => team.teamId);
    
    // Delete all tasks related to projects of this admin's teams
    const projects = await Project.find({ teamId: { $in: adminTeams } });
    const projectIds = projects.map(p => p._id);
    await Task.deleteMany({ project: { $in: projectIds } });

    // Delete all projects of this admin's teams
    await Project.deleteMany({ teamId: { $in: adminTeams } });

    // Delete all team setups for this admin
    await TeamSetup.deleteMany({ _id: { $in: adminTeams } });

    // Delete all users that were created by this admin
    await User.deleteMany({ createdBy: adminId });

    // Finally delete the admin
    await User.findByIdAndDelete(adminId);

    res.status(200).json({
      success: true,
      message: 'Admin and all associated data deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting admin' 
    });
  }
};

// Get System Statistics
exports.getSystemStats = async (req, res) => {
  try {
    // Check if the requester is a superadmin
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super administrators can view system statistics' 
      });
    }

    const totalAdmins = await User.countDocuments({ 
      userType: 'admin', 
      isAdmin: true 
    });
    
    const totalMembers = await User.countDocuments({ 
      userType: 'member', 
      isAdmin: false,
      isSuperAdmin: false 
    });
    
    const totalTeams = await TeamSetup.countDocuments({});
    const totalProjects = await Project.countDocuments({});
    const totalTasks = await Task.countDocuments({});

    // Task status breakdown
    const taskStatusBreakdown = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Project status breakdown
    const projectStatusBreakdown = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        users: {
          totalAdmins,
          totalMembers,
          total: totalAdmins + totalMembers
        },
        totalTeams,
        totalProjects,
        totalTasks,
        taskStatusBreakdown: Object.fromEntries(
          taskStatusBreakdown.map(item => [item._id, item.count])
        ),
        projectStatusBreakdown: Object.fromEntries(
          projectStatusBreakdown.map(item => [item._id, item.count])
        )
      }
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching system statistics' 
    });
  }
};

// Update Admin Status (activate/deactivate)
exports.updateAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { isActive } = req.body;

    // Check if the requester is a superadmin
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super administrators can update admin status' 
      });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (!admin.isAdmin || admin.isSuperAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify non-admin users or super administrators'
      });
    }

    // For now, we'll use isVerified to represent active/inactive status
    admin.isVerified = isActive;
    await admin.save();

    res.status(200).json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        isActive: admin.isVerified
      }
    });

  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating admin status' 
    });
  }
};

// Get All Users (Admins + Members) with Team Information
exports.getAllUsers = async (req, res) => {
  try {
    // Check if the requester is a superadmin
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only super administrators can view all users' 
      });
    }

    const users = await User.find({ 
      isSuperAdmin: false // Exclude other superadmins
    })
    .select('-password')
    .populate('createdBy', 'username email')
    .populate('teams.teamId', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      users: users,
      count: users.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching users' 
    });
  }
};

module.exports = exports;