const fs = require('node:fs');
const connectToDatabase = require('../config/database');
const User = require('../models/User');

if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 12) {
    throw new Error('Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters.');
  }

  await connectToDatabase();
  const normalizedUsername = username.trim().toLowerCase();
  let user = await User.findOne({ username: normalizedUsername }).select('+passwordHash');
  if (!user) user = new User({ username: normalizedUsername });
  user.passwordHash = password;
  user.role = 'admin';
  await user.save();
  console.log(`Admin account ready: ${user.username}`);
}

seedAdmin()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await require('mongoose').disconnect();
  });
