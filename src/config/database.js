const mongoose = require('mongoose');

const cacheKey = '__kellyCrochetMongoose';

function getConnectionCache() {
  if (!global[cacheKey]) {
    global[cacheKey] = { connection: null, promise: null };
  }

  return global[cacheKey];
}

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  const cache = getConnectionCache();
  if (cache.connection?.connection.readyState === 1) {
    return cache.connection;
  }

  if (cache.connection) {
    cache.connection = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      maxPoolSize: 5, // Keep each Vercel function instance's pool small.
      minPoolSize: 0, // Avoid idle connections while an instance is inactive.
      maxIdleTimeMS: 30000, // Reclaim connections after short serverless idle periods.
    }).catch((error) => {
      cache.promise = null;
      throw error;
    });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}

module.exports = connectToDatabase;