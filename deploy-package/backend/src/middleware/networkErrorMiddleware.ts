import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { ApiError } from './errorHandler';

/**
 * Middleware to handle network errors during file uploads and other operations
 * This middleware catches network-related errors and provides appropriate responses
 */
export const handleNetworkErrors = (req: Request, res: Response, next: NextFunction) => {
  // Store the original end method
  const originalEnd = res.end;
  
  // Determine appropriate timeout based on request type and size
  let timeoutDuration = 60000; // Default 60 second timeout
  
  // For file uploads, use longer timeout
  if (req.path.includes('/upload')) {
    if (req.path.includes('/large')) {
      // For large file uploads, use 2 minute timeout
      timeoutDuration = 120000;
    }
  }
  
  // Set a timeout to detect connection issues
  const timeout = setTimeout(() => {
    logger.error('Request timeout detected', {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      timeoutDuration: `${timeoutDuration/1000}s`
    });
    
    // If the response hasn't been sent yet, send a timeout error
    if (!res.headersSent) {
      res.status(504).json({
        status: 'error',
        message: 'Request timed out. Please try again later.',
        timeoutSeconds: timeoutDuration/1000
      });
    }
  }, timeoutDuration);
  
  // Override the end method to clear the timeout
  res.end = function(...args: any[]) {
    clearTimeout(timeout);
    return originalEnd.apply(this, args);
  };
  
  // Handle aborted connections
  req.on('close', () => {
    if (!res.writableEnded) {
      logger.warn('Client closed connection prematurely', {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      clearTimeout(timeout);
    }
  });
  
  // Error handling for network issues
  req.on('error', (err) => {
    logger.error('Network error during request processing', {
      error: err,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Network error occurred during request processing',
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined
      });
    }
  });
  
  next();
};

/**
 * Helper function to create network-related error responses
 */
export const createNetworkError = {
  timeout: (message = 'Request timed out') => 
    new ApiError(504, message),
  connectionReset: (message = 'Connection was reset') => 
    new ApiError(500, message),
  networkUnreachable: (message = 'Network is unreachable') => 
    new ApiError(503, message)
};

export default handleNetworkErrors;
