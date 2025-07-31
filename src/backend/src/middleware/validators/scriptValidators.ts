import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import logger from '../../utils/logger';
import { sanitizeInput } from '../../utils/sanitize';

/**
 * Validation rules for script listing/search
 */
export const scriptListValidationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  query('sort')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'executionCount'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Order must be ASC or DESC'),
  query('search')
    .optional()
    .isLength({ max: 200 })
    .customSanitizer(value => sanitizeInput(value))
    .withMessage('Search query too long')
];

/**
 * Validation rules for script ID parameter
 */
export const scriptIdValidationRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Script ID must be a positive integer')
];

/**
 * Validation rules for script creation/update
 */
export const scriptCreateUpdateValidationRules = [
  body('title')
    .notEmpty()
    .isLength({ min: 1, max: 255 })
    .customSanitizer(value => sanitizeInput(value))
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .customSanitizer(value => sanitizeInput(value))
    .withMessage('Description must not exceed 2000 characters'),
  body('content')
    .notEmpty()
    .isLength({ min: 1, max: 1048576 }) // 1MB limit
    .withMessage('Script content is required and must not exceed 1MB'),
  body('categoryId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .customSanitizer(value => sanitizeInput(value))
    .withMessage('Each tag must be between 1 and 50 characters')
];

/**
 * Validation rules for script execution
 */
export const scriptExecutionValidationRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Script ID must be a positive integer'),
  body('parameters')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object'),
  body('timeoutSeconds')
    .optional()
    .isInt({ min: 1, max: 3600 })
    .withMessage('Timeout must be between 1 and 3600 seconds')
];

/**
 * Validation rules for script analysis
 */
export const scriptAnalysisValidationRules = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Script ID must be a positive integer'),
  body('forceReanalyze')
    .optional()
    .isBoolean()
    .withMessage('forceReanalyze must be a boolean')
];

/**
 * Validation rules for script upload
 */
export const scriptUploadValidationRules = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 255 })
    .customSanitizer(value => sanitizeInput(value))
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .customSanitizer(value => sanitizeInput(value))
    .withMessage('Description must not exceed 2000 characters'),
  body('categoryId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer')
];

/**
 * Validation rules for batch operations
 */
export const batchOperationValidationRules = [
  body('scriptIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Script IDs must be an array with 1-100 items'),
  body('scriptIds.*')
    .isInt({ min: 1 })
    .withMessage('Each script ID must be a positive integer')
];

/**
 * Middleware to handle validation results
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));
    
    logger.warn('Script validation errors', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip,
      userId: req.user?.userId,
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
 * Combined validator middleware factory
 */
export function createValidator(rules: any[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.all(rules.map(rule => rule.run(req)));
      handleValidationErrors(req, res, next);
    } catch (error) {
      logger.error('Validation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.headers['x-request-id']
      });
      res.status(500).json({
        error: 'Internal server error',
        message: 'Validation error occurred'
      });
    }
  };
}