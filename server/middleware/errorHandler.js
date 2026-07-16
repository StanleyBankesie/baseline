/**
 * @file errorHandler.js
 * @description Global Express error handling middleware.
 */

import { logToCrashReport } from "../utils/crashLogger.js";

/**
 * Formats and sends error responses.
 *
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
export function errorHandler(err, req, res, next) {
  // Prevent sending headers multiple times if they have already been sent
  if (res.headersSent) {
    return next(err);
  }
  // Build the error response payload with status and message
  const status = err.status || 500;
  
  if (status >= 500) {
    logToCrashReport("HTTP_500", err, {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip,
      body: req.body,
    });
  }

  const payload = {
    error: err.code || "INTERNAL_ERROR",
    message: err.message || "Internal server error",
    companyId: err.companyId,
    stack: err.stack,
    sqlMessage: err.sqlMessage,
  };
  res.status(status).json(payload);
}
