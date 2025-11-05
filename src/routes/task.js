const express = require("express");
const router = express.Router();
const { getTasksByProject, createTask, updateTask, deleteTask } = require("../controllers/taskController");

router.get("/:projectId", getTasksByProject);
router.post("/", createTask);
router.put("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

module.exports = router;