/**
 * Standardized API response helpers
 */

const success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

const created = (res, data, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

const noContent = (res) => {
  return res.status(204).send();
};

const paginated = (res, { data, page, limit, total }) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      hasPrevious: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

const error = (res, message, statusCode = 500, code = null, errors = null) => {
  const response = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  success,
  created,
  noContent,
  paginated,
  error,
};
