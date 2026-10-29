const connectToDatabase = require('./config/database');
const { AppError } = require('./utils/errors');

function createApiHandler(routes, options = {}) {
  return async function apiHandler(request, response) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    const method = request.method?.toUpperCase();
    if (method === 'OPTIONS') {
      response.setHeader('Allow', Object.keys(routes).join(', '));
      return response.status(204).end();
    }

    const action = routes[method];
    if (!action) {
      response.setHeader('Allow', Object.keys(routes).join(', '));
      return response.status(405).json({ error: { message: 'Method not allowed.' } });
    }

    try {
      await connectToDatabase();
      const data = await action(request);
      const statusCode = method === 'POST' ? (options.postStatus || 201) : 200;
      return response.status(statusCode).json({ data });
    } catch (error) {
      if (error instanceof AppError) {
        return response.status(error.statusCode).json({ error: { message: error.message } });
      }
      if (error.name === 'ValidationError' || error.name === 'CastError' || error.name === 'StrictModeError') {
        return response.status(400).json({ error: { message: error.message } });
      }
      if (error.code === 11000) {
        return response.status(409).json({ error: { message: 'A record with the same unique value already exists.' } });
      }

      console.error('API request failed:', error.name || 'Error');
      return response.status(500).json({ error: { message: 'An unexpected server error occurred.' } });
    }
  };
}

module.exports = { createApiHandler };
