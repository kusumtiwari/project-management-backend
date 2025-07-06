const mongoose = require('mongoose');

const teamSetupSchema = mongoose.Schema({
  name: { type: String, required: true },
});

module.exports = mongoose.model('TeamSetup', teamSetupSchema)