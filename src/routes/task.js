const express = require("express");
const router = express.Router();
const { getTasksByProject, createTask, updateTask, deleteTask, getProjectMembers } = require("../controllers/taskController");

router.get("/:projectId/members", getProjectMembers);
router.get("/:projectId", getTasksByProject);
router.post("/", createTask);
router.put("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

module.exports = router;