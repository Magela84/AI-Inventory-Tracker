// Centralized Express error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[error] ${status} ${message}`);
  }

  res.status(status).json({
    error: {
      status,
      message,
    },
  });
}

export default errorHandler;
