const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
    format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'Iris-Bot' },
    transports: [
        new transports.Console({ level: 'warn', json: false, colorize: true }),
        new transports.File({ filename: './logs/error.log', level: 'error' }),
        new transports.File({ filename: './logs/combined.log' })
    ]
});

export default logger;