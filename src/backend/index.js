const logger = require('./logger');

process.on('uncaughtException', err => logger.error('Uncaught Exception:', err));
process.on('unhandledRejection', reason => logger.error('Unhandled Rejection:', reason));