import { createLogger, format, transports, Logger } from 'winston';
import { config } from '../config/app.config';

/**
 * Create and configure the application logger
 */
const logger: Logger = createLogger({
  level: config.logging.level,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'riot-api-server' },
  transports: [
    // Write logs to file
    new transports.File({ 
      filename: 'error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new transports.File({ 
      filename: config.logging.filename,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console output in development environment
if (config.server.nodeEnv !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    ),
  }));
}

/**
 * Log HTTP requests
 */
export function logHttpRequest(req: any, res: any, next: Function): void {
  const start = Date.now();
  
  // Process the request
  next();
  
  // Log after request is processed
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
}

export default logger;