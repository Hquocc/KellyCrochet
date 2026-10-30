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
      maxPoolSize: 10,
      minPoolSize: 1, // Giữ ít nhất 1 kết nối ấm (tránh SSL TLS handshake lag khi khách đặt hàng)
      maxIdleTimeMS: 60000,
    }).catch((error) => {
      cache.promise = null;
      throw error;
    });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}

module.exports = connectToDatabase;
