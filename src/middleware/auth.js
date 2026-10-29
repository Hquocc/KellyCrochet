const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errors');

function getTokenSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new AppError('JWT_SECRET must contain at least 32 bytes.', 500);
  }
  return secret;
}

function assertTokenConfig() {
  getTokenSecret();
}

async function optionalUser(request) {
  const authorization = request.headers?.authorization || request.headers?.Authorization;
  if (!authorization) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw new AppError('Authorization header must use Bearer token.', 401);

  let payload;
  try {
    payload = jwt.verify(match[1], getTokenSecret(), { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired access token.', 401);
  }

  if (!payload.sub || !['admin', 'user'].includes(payload.role)) {
    throw new AppError('Invalid access token.', 401);
  }
  const user = await User.findById(payload.sub).select('_id username role').lean();
  if (!user || user.role !== payload.role) throw new AppError('Invalid or expired access token.', 401);
  return { id: String(user._id), role: user.role, username: user.username };
}

async function requireUser(request, allowedRoles) {
  const user = await optionalUser(request);
  if (!user) throw new AppError('Authentication is required.', 401);
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AppError('You do not have permission to perform this action.', 403);
  }
  return user;
}

function createAccessToken(user) {
  return jwt.sign(
    { role: user.role, username: user.username },
    getTokenSecret(),
    { subject: user.id, expiresIn: '1h', algorithm: 'HS256' },
  );
}

module.exports = { assertTokenConfig, createAccessToken, optionalUser, requireUser };
