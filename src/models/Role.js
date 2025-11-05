const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          "view_project",
          "edit_project",
          "create_project",
          "delete_project",
          "view_role",
          "edit_role",
          "delete_role",
          "view_task",
          "create_task",
          "edit_task",
          "delete_task",
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);
