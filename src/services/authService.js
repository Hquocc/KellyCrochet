const User = require('../models/User');
const { assertTokenConfig, createAccessToken } = require('../middleware/auth');
const { AppError } = require('../utils/errors');

function assertCredentials(username, password) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,50}$/.test(username.trim())) {
    throw new AppError('Username must be 3-50 characters and use letters, numbers, dots, underscores or hyphens.');
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new AppError('Password must contain between 12 and 128 characters.');
  }
}

async function register(input) {
  assertTokenConfig();
  assertCredentials(input.username, input.password);
  const user = await User.create({
    username: input.username.trim().toLowerCase(),
    passwordHash: input.password,
    role: 'user',
  });
  return { user, token: createAccessToken(user) };
}

async function login(input) {
  assertTokenConfig();
  if (typeof input.username !== 'string' || typeof input.password !== 'string') {
    throw new AppError('Username and password are required.');
  }
  const user = await User.findOne({ username: input.username.trim().toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(input.password))) {
    throw new AppError('Username or password is incorrect.', 401);
  }
  return { user, token: createAccessToken(user) };
}

module.exports = { login, register };
