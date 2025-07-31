import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Simplified logger for development purposes
const { createLogger, format, transports } = winston;

// Make sure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
const testResultsLogDir = path.join(process.cwd(), '../../test-results/logs');

// Create both log directories
[logDir, testResultsLogDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Define custom log levels
const levels = {
  error: 0,
  warn: 1, 
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
});

// Create custom format for console output
const consoleFormat = format.combine(
  format.colorize({ all: true }),
  format.timestamp({
    format: 'HH:mm:ss',
  }),
  format.printf(
    (info) => {
      const { timestamp, level, message, ...meta } = info;
      
      // Helper function to safely stringify objects with circular references
      const safeStringify = (obj: any) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          // Skip certain keys that commonly cause circular references
          if (key === 'socket' || key === '_httpMessage' || key === 'request' || key === 'response') {
            return '[Circular Reference Removed]';
          }
          
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          
          // For axios errors, extract useful information
          if (value && value.isAxiosError) {
            return {
              message: value.message,
              code: value.code,
              status: value.response?.status,
              statusText: value.response?.statusText,
              data: value.response?.data,
              config: {
                url: value.config?.url,
                method: value.config?.method,
                timeout: value.config?.timeout
              }
            };
          }
          
          return value;
        }, 2);
      };
      
      const metaString = Object.keys(meta).length ? 
        `\n${safeStringify(meta)}` : '';
      
      return `${timestamp} ${level}: ${message}${
        info.stack ? `\n${info.stack}` : ''
      }${metaString}`;
    }
  )
);

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create transports array - simplified for development
const transportList = [
  new transports.Console({
    format: consoleFormat,
    handleExceptions: true,
  }),
  // Regular app logs
  new transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
  }),
  new transports.File({
    filename: path.join(logDir, 'combined.log'),
  }),
  // Test result logs for troubleshooting
  new transports.File({
    filename: path.join(testResultsLogDir, 'error.log'),
    level: 'error',
  }),
  new transports.File({
    filename: path.join(testResultsLogDir, 'combined.log'),
  }),
  new transports.File({
    filename: path.join(testResultsLogDir, 'debug.log'),
    level: 'debug',
  }),
];

// Create logger instance
const logger = createLogger({
  level: logLevel,
  levels,
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  defaultMeta: { 
    service: 'psscript-api',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.1.0'
  },
  transports: transportList,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test' && process.env.LOG_IN_TESTS !== 'true',
});

// Create HTTP stream for morgan integration
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Add stream property to logger
(logger as any).stream = stream;

// Log initialization
if (process.env.NODE_ENV !== 'test') {
  logger.info(`Logger initialized at level: ${logLevel}`);
}

// Add helper methods for database logging
interface ExtendedLogger extends winston.Logger {
  logDbError: (operation: string, error: any) => void;
  logRedisError: (operation: string, error: any) => void;
  logConnectionAttempt: (type: string, config: any) => void;
}

// Cast to extended logger type
const extendedLogger = logger as ExtendedLogger;

extendedLogger.logDbError = (operation: string, error: any) => {
  logger.error(`Database ${operation} error`, { 
    error: error.message,
    stack: error.stack,
    code: error.code,
    detail: error.detail || error.original?.detail
  });
};

extendedLogger.logRedisError = (operation: string, error: any) => {
  logger.error(`Redis ${operation} error`, { 
    error: error.message,
    stack: error.stack,
    code: error.code
  });
};

extendedLogger.logConnectionAttempt = (type: string, config: any) => {
  // Sanitize connection info to avoid logging credentials
  const sanitizedConfig = { ...config };
  if (sanitizedConfig.password) sanitizedConfig.password = '[REDACTED]';
  if (sanitizedConfig.user) sanitizedConfig.user = '[PRESENT]';
  
  logger.info(`Attempting to connect to ${type}`, sanitizedConfig);
};

// Export logger instance with extended interface
export default extendedLogger;