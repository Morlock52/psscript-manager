import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom error class with status code
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default error status and message
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorDetails: any = undefined;
  let isOperational = false;
  
  // Log the error
  logger.error(`Error: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
    error: err
  });
  
  // If it's our custom API error, use its status code and message
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose or other validation error
    statusCode = 400;
    message = 'Validation Error';
    errorDetails = err.message;
  } else if (err.name === 'JsonWebTokenError') {
    // JWT validation error
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    // Sequelize validation error
    statusCode = 400;
    message = 'Validation Error';
    // Extract error details from Sequelize error
    errorDetails = (err as any).errors?.map((e: any) => ({
      field: e.path,
      message: e.message
    }));
  }
  
  // Determine environment-specific response
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Send appropriate error response
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(isDevelopment && { stack: err.stack }),
    ...(errorDetails && { errors: errorDetails }),
    ...(isDevelopment && { isOperational })
  });
  
  // If this is an unhandled error (not operational), log for investigation
  if (!isOperational) {
    logger.error('Non-operational error occurred!', {
      error: err,
      stack: err.stack
    });
  }
};

// Handle uncaught exceptions globally
export const setupUncaughtExceptionHandling = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', {
      error: err,
      stack: err.stack
    });
    
    // Exit with error code for non-operational errors
    if (err instanceof ApiError && err.isOperational) {
      logger.info('Operational error, continuing execution');
    } else {
      logger.error('Non-operational error, shutting down');
      process.exit(1);
    }
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason,
      promise
    });
    
    // Convert to error and let uncaughtException handler deal with it
    throw reason;
  });
};

// Handle 404 errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Resource not found: ${req.originalUrl}`);
  next(error);
};

// Helper function to create typed error objects
export const createError = {
  badRequest: (message: string) => new ApiError(400, message),
  unauthorized: (message = 'Unauthorized') => new ApiError(401, message),
  forbidden: (message = 'Forbidden') => new ApiError(403, message),
  notFound: (message = 'Resource not found') => new ApiError(404, message),
  conflict: (message = 'Resource already exists') => new ApiError(409, message),
  internal: (message = 'Internal Server Error', isOperational = false) => 
    new ApiError(500, message, isOperational),
  serviceUnavailable: (message = 'Service Unavailable') => new ApiError(503, message)
};