require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const connectDB = require('../config/database');

const createAdminUser = async () => {
  try {
    await connectDB();
    
    const adminUser = {
      name: 'System Administrator',
      email: 'admin@roomreservation.com',
      password: 'admin123',
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const user = await User.create(adminUser);
    console.log('✅ Admin user created successfully:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${user.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();