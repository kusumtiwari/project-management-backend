const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const clearUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await User.deleteMany({});
    console.log(`🧹 Deleted ${result.deletedCount} users`);

  } catch (error) {
    console.error('❌ Error clearing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

clearUsers();
