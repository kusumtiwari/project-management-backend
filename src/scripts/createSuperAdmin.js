const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if any superadmin exists
    const existingSuperAdmin = await User.findOne({ isSuperAdmin: true });
    
    if (existingSuperAdmin) {
      console.log('SuperAdmin already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Get superadmin details from command line or use defaults
    const email = process.argv[2] || 'superadmin@planora.com';
    const password = process.argv[3] || 'SuperAdmin123!';
    const username = process.argv[4] || 'Super Administrator';

    // Create superadmin
    const superAdmin = new User({
      email,
      password,
      username,
      isVerified: true,
      userType: 'superadmin',
      isAdmin: true,
      isSuperAdmin: true,
      hasCompletedSetup: true,
      createdBy: null
    });

    await superAdmin.save();

    console.log('✅ SuperAdmin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Username:', username);
    console.log('\n⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating SuperAdmin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
createSuperAdmin();