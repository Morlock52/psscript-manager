/**
 * Content Security Policy configuration for documentation pages
 */

/**
 * Generate a random nonce for CSP
 * @returns Base64 encoded nonce
 */
export const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

/**
 * Get CSP directives for the application
 * @param nonce - The nonce to use for inline scripts
 * @returns CSP directive string
 */
export const getCSPDirectives = (nonce: string): string => {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"],
    'style-src': ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
    'img-src': ["'self'", "data:", "https:"],
    'font-src': ["'self'"],
    'connect-src': ["'self'", "http://localhost:*", "https://api.openai.com"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'child-src': ["'self'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", "blob:"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'upgrade-insecure-requests': []
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

/**
 * Add CSP meta tag to document head
 * @param nonce - The nonce to use
 */
export const addCSPMetaTag = (nonce: string): void => {
  // Remove existing CSP meta tag if any
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) {
    existing.remove();
  }

  // Create new CSP meta tag
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = getCSPDirectives(nonce);
  
  // Add to document head
  document.head.appendChild(meta);
};

/**
 * Initialize CSP for the application
 * @returns The generated nonce
 */
export const initializeCSP = (): string => {
  const nonce = generateNonce();
  
  // Add CSP meta tag
  addCSPMetaTag(nonce);
  
  // Store nonce for use in the application
  if (typeof window !== 'undefined') {
    (window as any).__CSP_NONCE__ = nonce;
  }
  
  return nonce;
};