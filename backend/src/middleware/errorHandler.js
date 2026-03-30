const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const response = require('../utils/response');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error({
      message: err.message,
      stack: err.stack,
      requestId: req.requestId,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn({
      message: err.message,
      code: err.code,
      requestId: req.requestId,
      path: req.path,
    });
  }

  // Handle operational errors
  if (err.isOperational) {
    return response.error(
      res,
      err.message,
      err.statusCode,
      err.code,
      err.errors
    );
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    return response.error(
      res,
      'A record with this value already exists',
      409,
      'DUPLICATE_ENTRY'
    );
  }

  if (err.code === 'P2025') {
    return response.error(res, 'Record not found', 404, 'NOT_FOUND');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return response.error(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return response.error(res, 'Token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    return response.error(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.array()
    );
  }

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return response.error(res, 'File too large', 400, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return response.error(res, 'Unexpected field', 400, 'UNEXPECTED_FIELD');
  }

  // Production: don't leak error details
  if (process.env.NODE_ENV === 'production') {
    return response.error(
      res,
      'An unexpected error occurred',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Development: include stack trace
  return response.error(
    res,
    err.message,
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};

/**
 * Handle 404 routes
 */
const notFoundHandler = (req, res) => {
  return response.error(res, `Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
