// utils/logger.js
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// --- Log folder ---
const logDir = path.join(__dirname, '../logs');

// --- Daily Rotate File Transport ---
const dailyTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxFiles: '30d', // keep logs for 30 days
  level: process.env.LOG_FILE_LEVEL || 'info',
  handleExceptions: true,
});

// --- Console Transport ---
const consoleTransport = new winston.transports.Console({
  level: process.env.LOG_CONSOLE_LEVEL || 'debug',
  handleExceptions: true,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(info => `[${info.level}] ${info.timestamp}: ${info.message}`)
  ),
});

// --- Logger ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [dailyTransport, consoleTransport],
  exitOnError: false, // do not exit on handled exceptions
});

module.exports = logger;
