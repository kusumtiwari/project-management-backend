const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    userType: { 
      type: String, 
      enum: ['superadmin', 'admin', 'member'], 
      default: 'member' 
    },
    isAdmin: { type: Boolean, default: false }, // Keep for backward compatibility
    isSuperAdmin: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // null for self-registered superadmins, ObjectId for admin/member created by others
    },
    teams: [
      {
        teamId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TeamSetup",
          required: true,
        },
        teamName: { type: String, required: true },
        role: { type: String, enum: ["admin", "member"], default: "member" },
        roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
        permissions: [{ type: String }],
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    hasCompletedSetup: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.addTeam = function (teamId, teamName, role = "member") {
  this.teams.push({ teamId, teamName, role, joinedAt: new Date() });
  if (this.teams.length === 1) this.hasCompletedSetup = true;
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
