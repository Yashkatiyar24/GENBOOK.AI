import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} ${level}: ${message}${Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp()),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(timestamp(), json())
        : combine(colorize(), timestamp(), devFormat),
    }),
  ],
});

// Convenience shortcuts
(logger as any).http = (msg: string, meta?: any) => logger.log('http', msg, meta);

export default logger;
