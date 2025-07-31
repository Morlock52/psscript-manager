import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The potentially unsafe HTML string
 * @param options - DOMPurify options
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (dirty: string, options?: any): string => {
  // Default configuration for documentation content
  const defaultConfig = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'], // Allow target attribute for links
    ADD_TAGS: ['span'], // Allow span for inline styling
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onmouseover', 'onerror', 'onload']
  };

  // Merge with user options
  const config = { ...defaultConfig, ...options };

  return DOMPurify.sanitize(dirty, config) as unknown as string;
};

/**
 * Sanitize user input for display (more restrictive)
 * @param input - User input string
 * @returns Sanitized string with no HTML
 */
export const sanitizeUserInput = (input: string): string => {
  // Remove all HTML tags for user input
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

/**
 * Sanitize URL to prevent javascript: and data: protocols
 * @param url - URL string to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    // Invalid URL
    return '';
  }
};

/**
 * Escape HTML entities for safe display
 * @param str - String to escape
 * @returns Escaped string
 */
export const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};