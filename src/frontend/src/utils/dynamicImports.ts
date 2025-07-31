/**
 * Dynamic import utilities for heavy libraries
 * These functions load libraries only when needed to reduce initial bundle size
 */

// Cache for loaded modules to avoid re-importing
const moduleCache = new Map<string, any>();

/**
 * Dynamically import D3.js for data visualization
 */
export const importD3 = async () => {
  if (moduleCache.has('d3')) {
    return moduleCache.get('d3');
  }
  
  const d3 = await import('d3');
  moduleCache.set('d3', d3);
  return d3;
};

/**
 * Dynamically import JSZip for file compression
 */
export const importJSZip = async () => {
  if (moduleCache.has('jszip')) {
    return moduleCache.get('jszip');
  }
  
  const JSZip = (await import('jszip')).default;
  moduleCache.set('jszip', JSZip);
  return JSZip;
};

/**
 * Dynamically import Marked for markdown parsing
 */
export const importMarked = async () => {
  if (moduleCache.has('marked')) {
    return moduleCache.get('marked');
  }
  
  const { marked } = await import('marked');
  moduleCache.set('marked', marked);
  return marked;
};

/**
 * Dynamically import React Syntax Highlighter
 */
export const importSyntaxHighlighter = async () => {
  if (moduleCache.has('react-syntax-highlighter')) {
    return moduleCache.get('react-syntax-highlighter');
  }
  
  const module = await import('react-syntax-highlighter');
  const { Prism: SyntaxHighlighter } = module;
  const { tomorrow } = await import('react-syntax-highlighter/dist/esm/styles/prism');
  
  const result = { SyntaxHighlighter, tomorrow };
  moduleCache.set('react-syntax-highlighter', result);
  return result;
};

/**
 * Dynamically import date-fns functions
 */
export const importDateFns = async () => {
  if (moduleCache.has('date-fns')) {
    return moduleCache.get('date-fns');
  }
  
  const dateFns = await import('date-fns');
  moduleCache.set('date-fns', dateFns);
  return dateFns;
};

/**
 * Dynamically import React Markdown
 */
export const importReactMarkdown = async () => {
  if (moduleCache.has('react-markdown')) {
    return moduleCache.get('react-markdown');
  }
  
  const ReactMarkdown = (await import('react-markdown')).default;
  moduleCache.set('react-markdown', ReactMarkdown);
  return ReactMarkdown;
};

/**
 * Preload a module in the background
 */
export const preloadModule = (importFn: () => Promise<any>) => {
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => importFn());
  } else {
    setTimeout(() => importFn(), 1);
  }
};

/**
 * Preload commonly used modules after initial app load
 */
export const preloadCommonModules = () => {
  // Preload modules that are likely to be used
  preloadModule(importMarked);
  preloadModule(importDateFns);
  preloadModule(importSyntaxHighlighter);
};