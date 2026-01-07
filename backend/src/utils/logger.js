const winston = require('winston');
const config = require('../config');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: config.nodeEnv === 'development' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: config.nodeEnv === 'development' ? format : jsonFormat,
  }),
];

// Add file transport in production
if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  transports,
});

module.exports = logger;
