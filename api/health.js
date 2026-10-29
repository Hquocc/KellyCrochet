const mongoose = require('mongoose');
const connectToDatabase = require('../src/config/database');

module.exports = async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ status: 'error', message: 'Method not allowed.' });
  }

  try {
    await connectToDatabase();
    await mongoose.connection.db.admin().ping();

    return response.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('MongoDB health check failed:', error.name || 'Error');
    return response.status(503).json({ status: 'error', database: 'unavailable' });
  }
};
