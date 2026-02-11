const mongoose = require("mongoose");

const PermissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  label: {
    type: String, // optional readable label
  },
});

module.exports = mongoose.model("Permission", PermissionSchema);
