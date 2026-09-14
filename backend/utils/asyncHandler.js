/**
 * Wraps an async route handler to catch any unhandled promise rejections
 * and pass them automatically to Express next() error handler.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
