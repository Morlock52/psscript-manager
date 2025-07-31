import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import logger from '../../utils/logger';

/**
 * Validation rules for login.
 */
export const loginValidationRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

/**
 * Validation rules for registration.
 */
export const registerValidationRules = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-50 characters long and contain only letters, numbers, hyphens, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

/**
 * Middleware to handle validation results.
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));
    
    logger.warn('Validation errors in request', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
    
    res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input and try again',
      details: errorMessages
    });
    return;
  }
  
  next();
}

/**
 * Combined login validator middleware.
 */
export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  // Run validation rules
  Promise.all(loginValidationRules.map(rule => rule.run(req)))
    .then(() => {
      handleValidationErrors(req, res, next);
    })
    .catch(error => {
      logger.error('Login validation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation error occurred'
      });
    });
}

/**
 * Combined registration validator middleware.
 */
export function validateRegister(req: Request, res: Response, next: NextFunction): void {
  // Run validation rules
  Promise.all(registerValidationRules.map(rule => rule.run(req)))
    .then(() => {
      handleValidationErrors(req, res, next);
    })
    .catch(error => {
      logger.error('Registration validation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation error occurred'
      });
    });
}
