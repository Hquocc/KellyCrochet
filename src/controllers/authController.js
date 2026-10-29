const authService = require('../services/authService');
const { requireUser } = require('../middleware/auth');
const { readBody } = require('../utils/http');

async function register(request) {
  const result = await authService.register(readBody(request));
  return { user: result.user, token: result.token };
}

async function login(request) {
  const result = await authService.login(readBody(request));
  return { user: result.user, token: result.token };
}

async function me(request) {
  const user = await requireUser(request);
  return { id: user.id, username: user.username, role: user.role };
}

module.exports = { login, me, register };
