import winston from 'winston'

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
}

const level = () => {
    const env = process.env.NODE_ENV || 'development'
    const isDevelopment = env === 'development'
    return isDevelopment ? 'debug' : 'info'
}

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    verbose: 'blue',
    debug: 'white'
};

winston.addColors(colors)

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf((info) => {
        let log = `{"timestamp":"${info.timestamp}","level":"${info.level}","message":"${info.message}"`;
        if (info.user) {
            log += `,"user":{"id":"${info.user.id}","username":"${info.user.username}","discriminator":"${info.user.discriminator}"}`;
        }
        if (info.guild) {
            log += `,"guild":{"id":"${info.guild.id}","name":"${info.guild.name}"}`;
        }
        log += `}`;
        return log;
    })
);

const transports = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.printf((info) => {
                return `[${info.timestamp}] [${info.level.toUpperCase()}]\t: ${info.message}`;
            }),
            winston.format.colorize({ all: true })
        )
    }),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/all.log' })
];

const Logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports
});

export default Logger;