const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'toy_erp' });
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@toyerp.com' });
  if (existing) {
    console.log('Admin user already exists. Email: admin@toyerp.com');
    process.exit(0);
  }

  await User.create({
    name: 'Master Admin',
    email: 'admin@toyerp.com',
    password: 'Admin@1234',
    role: 'master_admin',
    isActive: true
  });

  console.log('✅ Master Admin created successfully!');
  console.log('   Email:    admin@toyerp.com');
  console.log('   Password: Admin@1234');
  console.log('   ⚠️  Change this password immediately after first login!');
  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err.message);
  process.exit(1);
});
