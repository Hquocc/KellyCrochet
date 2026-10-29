const { AppError } = require('./errors');

function readBody(request) {
  if (request.body === undefined || request.body === null || request.body === '') return {};
  if (typeof request.body === 'object' && !Array.isArray(request.body)) return request.body;
  if (typeof request.body !== 'string') throw new AppError('Request body must be a JSON object.');

  try {
    const body = JSON.parse(request.body);
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      throw new AppError('Request body must be a JSON object.');
    }
    return body;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Request body contains invalid JSON.');
  }
}

function pagination(request) {
  const query = request.query || {};
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  if (!Number.isInteger(page) || page < 1) throw new AppError('page must be a positive integer.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('limit must be an integer between 1 and 100.');
  }
  return { page, limit, skip: (page - 1) * limit };
}

function pageResult(items, total, page, limit) {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

function assertObjectId(value, field = 'id') {
  const mongoose = require('mongoose');
  if (!mongoose.isValidObjectId(value)) throw new AppError(`${field} is invalid.`);
  return value;
}

module.exports = { assertObjectId, pageResult, pagination, readBody };
