const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async(req,res,next) => {
    const authHeader = req.headers.authorization;
    let token = undefined;
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers.cookie) {
      // parse 'token' from cookie header without extra deps
      try {
        const cookiePairs = req.headers.cookie.split(';').map((c)=>c.trim().split('='));
        const cookieMap = Object.fromEntries(cookiePairs);
        token = cookieMap.token;
      } catch (e) {
        // ignore parse errors
      }
    }

    if(!token){
        return res.status(401).json({ message: "Not authorized, token missing" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      const user = await User.findById(decoded.id).select("-password");

      console.log(user,'user from middleware')
      if (!user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      req.user = user; // attach user to request
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// Middleware to check if user is SuperAdmin
exports.requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Super administrator privileges required" 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Server error in authorization" 
    });
  }
};

// Middleware to check if user is Admin or SuperAdmin
exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Administrator privileges required" 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Server error in authorization" 
    });
  }
};

// CRITICAL NEW MIDDLEWARE: Enforce admin isolation
// Ensures admins can only access their own resources
exports.requireAdminOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Superadmins bypass ownership checks
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Non-admins (members) are handled by checkResourceAccess
    if (!req.user.isAdmin) {
      return next();
    }

    // For admins, we'll verify ownership in controller based on resource
    // This middleware sets up the scoping filter for queries
    if (req.user.isAdmin) {
      // Add adminId filter to query - will be used in controllers
      req.adminScope = { adminId: req.user._id };
    }

    next();
  } catch (error) {
    console.error('Admin ownership middleware error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error in ownership verification"
    });
  }
};

// Middleware to check resource access for members (can only access assigned projects/tasks)
exports.checkResourceAccess = async (req, res, next) => {
  try {
    const user = req.user;

    // SuperAdmins and Admins have full access (within their scope for admins)
    if (user.isSuperAdmin || user.isAdmin) {
      return next();
    }

    // For members, check if they have access to the requested resource
    const { projectId, taskId } = req.params;

    if (projectId) {
      const Project = require('../models/Project');
      const project = await Project.findById(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Check if user is assigned to this project
      const isAssigned = project.teamMembers.some(
        member => member.userId.toString() === user._id.toString()
      );

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to this project"
        });
      }
    }

    if (taskId) {
      const Task = require('../models/Task');
      const task = await Task.findById(taskId).populate('project');

      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Task not found"
        });
      }

      // Check if user is assigned to this task or the task's project
      const isTaskAssigned = task.assignedTo && task.assignedTo.toString() === user._id.toString();
      const isProjectMember = task.project.teamMembers.some(
        member => member.userId.toString() === user._id.toString()
      );

      if (!isTaskAssigned && !isProjectMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You are not assigned to this task or its project"
        });
      }
    }

    next();
  } catch (error) {
    console.error('Resource access check error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error in resource access check"
    });
  }
};
