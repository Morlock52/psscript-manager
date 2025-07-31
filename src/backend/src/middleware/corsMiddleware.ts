// CORS middleware for handling cross-origin requests
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Enhanced CORS middleware that adds permissive headers for file uploads
 * This helps prevent CORS issues with multipart/form-data uploads
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get the origin from the request
  const origin = req.headers.origin || '*';
  
  // Add permissive CORS headers
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-openai-api-key, x-api-key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug('[CORS] Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  logger.debug('[CORS] CORS headers added to response');
  next();
};

/**
 * Special CORS middleware specifically for file upload endpoints
 * This is more permissive and ensures multipart/form-data requests work properly
 */
export const uploadCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get the origin from the request
  const origin = req.headers.origin || '*';
  
  // Add permissive CORS headers specifically for file uploads
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-openai-api-key, x-api-key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Log headers for debugging
  logger.debug('[CORS] Upload request headers:', req.headers);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug('[CORS] Handling OPTIONS preflight request for upload');
    return res.status(200).end();
  }
  
  logger.debug('[CORS] Upload CORS headers added to response');
  next();
};
