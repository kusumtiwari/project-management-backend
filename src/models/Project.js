const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Support multiple teams per project
    teams: [
      {
        teamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TeamSetup",
          required: true,
        },
        addedAt: { type: Date, default: Date.now },
      }
    ],
    // Keep teamId for backward compatibility (will be deprecated)
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamSetup",
      required: false, // Made optional for backward compatibility
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "On Hold", "Planning"],
      default: "Not Started",
    },
    // Enhanced team members with more details
    teamMembers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        teamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TeamSetup",
          required: true,
        },
        role: {
          type: String,
          enum: ["lead", "member", "viewer"],
          default: "member"
        },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
    // Project creator/owner
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    // CRITICAL: Admin ownership field - enforces admin isolation
    // Every project SHOULD belong to exactly one admin
    // Using default to handle existing projects (falls back to createdBy)
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional with default for backward compatibility
      default: function() {
        return this.createdBy; // Default to createdBy for existing projects
      },
      index: true // Important for query performance
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    createdAt: { type: Date, default: Date.now },
    deadline: Date,
    description: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient admin-scoped queries
projectSchema.index({ adminId: 1, createdAt: -1 });
projectSchema.index({ adminId: 1, status: 1 });

module.exports = mongoose.model("Project", projectSchema);
