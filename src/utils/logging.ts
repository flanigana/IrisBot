import { Guild, TextChannel, User, VoiceChannel } from 'discord.js';
import winston from 'winston';

const levels = {
	error: 0,
	warn: 1,
	info: 2,
	verbose: 3,
	debug: 4,
};

const level = () => {
	const env = process.env.NODE_ENV || 'development';
	const isDevelopment = env === 'development';
	return isDevelopment ? 'debug' : 'info';
};

const colors = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	verbose: 'blue',
	debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	winston.format.printf((info) => {
		let log = `{"timestamp":"${info.timestamp}","level":"${info.level}","message":"${info.message}"`;
		if (info.error && info.error instanceof Error) {
			const { error } = info;
			log += `,"error":{"name":"${error.name}","message":"${error.message}","stack":"${error.stack}"}`;
		}
		if (info.user && info.user instanceof User) {
			const { user } = info;
			log += `,"user":{"id":"${user.id}","username":"${user.username}","discriminator":"${user.discriminator}"}`;
		}
		if (info.guild && info.guild instanceof Guild) {
			const { guild } = info;
			log += `,"guild":{"id":"${guild.id}","name":"${guild.name}"}`;
		}
		if (info.template) {
			const { template } = info;
			log += `,"template":{"_id":"${template._id}","guildId":"${template.guildId}","name":"${template.name}"}`;
		}
		if (info.channel && (info.channel instanceof TextChannel || info.channel instanceof VoiceChannel)) {
			const { channel } = info;
			log += `,"channel":{"id":"${channel.id}","guildId":"${channel.guild.id}","channelName":"${channel.name}"}`;
		}
		if (info.ign) {
			log += `,"ign":${info.ign}`;
		}
		log += '}';
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
		),
	}),
	new winston.transports.File({
		filename: 'logs/error_and_warn.log',
		level: 'warn',
	}),
	new winston.transports.File({ filename: 'logs/all.log' }),
];

const Logger = winston.createLogger({
	level: level(),
	levels,
	format,
	transports,
});

export default Logger;
