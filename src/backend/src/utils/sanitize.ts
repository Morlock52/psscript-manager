import validator from 'validator';

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - User input string
 * @returns Sanitized string
 */
export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';
  
  // Remove HTML tags and escape special characters
  return validator.escape(validator.stripLow(input.trim()));
};

/**
 * Validate and sanitize URL
 * @param url - URL string to validate
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  // Only allow http and https protocols
  if (validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
    return url;
  }
  
  return '';
};

/**
 * Sanitize array of strings (for tags, sources, etc.)
 * @param arr - Array of strings
 * @returns Sanitized array
 */
export const sanitizeStringArray = (arr: string[]): string[] => {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .filter(item => typeof item === 'string')
    .map(item => sanitizeUserInput(item))
    .filter(item => item.length > 0);
};