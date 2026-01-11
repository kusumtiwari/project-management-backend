const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
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
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // must have an admin
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Optional: index for admin filtering
roleSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model("Role", roleSchema);
