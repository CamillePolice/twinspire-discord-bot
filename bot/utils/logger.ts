// src/utils/logger.ts
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file streams
const errorLogStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });
const infoLogStream = fs.createWriteStream(path.join(logsDir, 'info.log'), { flags: 'a' });

// Log levels
enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

// Format timestamp
const getTimestamp = (): string => {
  return new Date().toISOString();
};

// Main logger function
export const logger = {
  error: (message: string, error?: Error): void => {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] [${LogLevel.ERROR}] ${message}${error ? ': ' + error.stack : ''}`;

    // Write to error log file
    errorLogStream.write(logMessage + '\n');

    // Always output errors to console
    console.error(logMessage);
  },

  warn: (message: string): void => {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] [${LogLevel.WARN}] ${message}`;

    // Write to info log file
    infoLogStream.write(logMessage + '\n');

    // Output to console
    console.warn(logMessage);
  },

  info: (message: string): void => {
    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] [${LogLevel.INFO}] ${message}`;

    // Write to info log file
    infoLogStream.write(logMessage + '\n');

    // Output to console in non-production
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG === 'true') {
      console.info(logMessage);
    }
  },

  debug: (message: string): void => {
    // Only log debug messages if DEBUG is true
    if (process.env.DEBUG !== 'true') return;

    const timestamp = getTimestamp();
    const logMessage = `[${timestamp}] [${LogLevel.DEBUG}] ${message}`;

    // Output to console only
    console.debug(logMessage);
  },
};

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', error);
  // In production, you might want to gracefully shutdown or restart
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    `Unhandled Promise Rejection`,
    reason instanceof Error ? reason : new Error(String(reason)),
  );
});
