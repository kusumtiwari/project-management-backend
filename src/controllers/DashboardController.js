const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// GET /api/dashboard/summary
// Returns top-level metrics for the dashboard
exports.getSummary = async (req, res) => {
  try {
    // Basic aggregates
    const [totalProjects, totalTasks] = await Promise.all([
      Project.countDocuments({}),
      Task.countDocuments({}),
    ]);

    const tasksByStatusAgg = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const tasksByStatus = tasksByStatusAgg.reduce((acc, cur) => {
      acc[cur._id || 'unknown'] = cur.count;
      return acc;
    }, {});

    const completedTasks = tasksByStatus['done'] || 0;
    const inProgressTasks = (tasksByStatus['in-progress'] || 0) + (tasksByStatus['review'] || 0);
    const backlogTasks = tasksByStatus['backlog'] || 0;
    const deployedTasks = tasksByStatus['deployed'] || 0;

    // Upcoming deadlines (next 7 tasks by nearest deadline in future)
    const upcomingDeadlines = await Task.find({ deadline: { $gte: new Date() } })
      .sort({ deadline: 1 })
      .limit(7)
      .select('_id title deadline status');

    // Team members count (global)
    const teamMembersCount = await User.countDocuments({});

    // Recent activity (latest updated tasks)
    const recentActivity = await Task.find({})
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('_id title status updatedAt');

    return res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalTasks,
        tasksByStatus: {
          backlog: backlogTasks,
          inProgress: inProgressTasks,
          review: tasksByStatus['review'] || 0,
          done: completedTasks,
          deployed: deployedTasks,
        },
        completedTasks,
        inProgressTasks,
        upcomingDeadlines,
        teamMembersCount,
        recentActivity,
      }
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
