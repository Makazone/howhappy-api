import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport:
    isDevelopment && !isTest
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss',
          },
        }
      : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: [
      'password',
      'passwordHash',
      'authorization',
      'cookie',
      'token',
      'secret',
      'apiKey',
      '*.password',
      '*.passwordHash',
      '*.authorization',
      '*.token',
      '*.secret',
      '*.apiKey',
    ],
    censor: '[REDACTED]',
  },
});

export const createLogger = (name: string): pino.Logger => {
  return logger.child({ name });
};
