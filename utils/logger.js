// utils/logger.js
const { createLogger, transports, format } = require('winston');
const { combine, timestamp, printf, errors } = format;

// Formato de log
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

// Configuración de Winston
const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/error.log' })
    ]
});

module.exports = logger;
