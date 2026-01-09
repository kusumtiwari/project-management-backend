const mongoose = require('mongoose');

const teamSetupSchema = mongoose.Schema({
  name: { type: String, required: true },
  // CRITICAL: Admin ownership for team isolation
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for backward compatibility
    default: function() {
      // Will be set during team creation
      return null;
    },
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  }
}, {
  timestamps: true
});

// Compound index for efficient admin-scoped queries
teamSetupSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('TeamSetup', teamSetupSchema)
