// 404 Route Not Found Middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Centralized Error Handler Middleware
export const errorHandler = (err, req, res, next) => {
  // If status code is 200, default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`[Error ${statusCode}] ${req.method} ${req.originalUrl}:`, err.message);

  let message = err.message || 'Internal Server Error';

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    message = 'An account with that email address already exists.';
    return res.status(409).json({
      success: false,
      message,
      field: 'email',
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    message = messages.join('. ');
    return res.status(400).json({
      success: false,
      message,
      errors: messages,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid session token. Please log in again.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.',
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
