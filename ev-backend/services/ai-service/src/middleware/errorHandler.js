import { logger } from "../config/logger.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  logger.error(
    {
      err: error,
      method: req.method,
      path: req.originalUrl
    },
    "AI service request failed"
  );

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });
};
