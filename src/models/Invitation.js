const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamSetup",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invitation", invitationSchema);
