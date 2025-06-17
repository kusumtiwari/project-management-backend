const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: {
    type: String,
    enum: ["Not Started", "In Progress", "Completed"],
    default: "Not Started",
  },
//   ObjectId type means you are storing the unique ID(s) of documents from another collection (the referenced one). 
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  deadline: Date,
  description: String,
});

module.exports = mongoose.model('Project', projectSchema)