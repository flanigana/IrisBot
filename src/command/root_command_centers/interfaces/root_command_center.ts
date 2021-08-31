import { Guild, GuildMember, Message, MessageEmbed, TextBasedChannels, User } from 'discord.js';
import { injectable } from 'inversify';
import { EmbedField } from '../../../utils/client_tools';
import { MessageParser } from '../../../utils/message_parser';
import { MessageCommand } from '../../message_command';
import { BotPermission, RootCommandName, SubCommandName } from './command_types';

@injectable()
export abstract class RootCommandCenter {
	public static readonly ROOT_COMMAND_NAME: RootCommandName;
	public static readonly MINIMUM_COMMAND_LENGTH: number;
	public static readonly REQUIRED_SUB_COMMAND: boolean;
	public static readonly SUB_COMMANDS: SubCommandName[] | RootCommandName[];
	public static readonly REQUIRED_PERMISSIONS: BotPermission[];

	public static readonly ALL_HELP_FIELD: EmbedField = {
		name: 'For More General Help',
		value: 'Use the `help` command to get more general help and learn how to use command parameters',
	};

	private readonly parameters: CommandParameters;

	public abstract parse(attr: CommandAttributes): MessageCommand<RootCommandCenter, CommandParameters>;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public static help(embed: MessageEmbed): MessageEmbed {
		throw new Error('Method not implemented.');
	}

	public abstract get RootCommandName(): RootCommandName;
	public abstract get RequiredPermissions(): BotPermission[];
}

export abstract class CommandParameters {
	private readonly length: number;
}

export class CommandAttributes {
	private readonly _Channel: TextBasedChannels;
	private readonly _User: User;
	private readonly _Guild: Guild;
	private readonly _Member: GuildMember;
	private readonly _Args: string[];

	private constructor(channel: TextBasedChannels, user: User, guild: Guild, member: GuildMember, args: string[]) {
		this._Channel = channel;
		this._User = user;
		this._Guild = guild;
		this._Member = member;
		this._Args = args;
	}

	public static fromMessage({ channel, author: user, guild, member, content }: Message): CommandAttributes {
		const args = MessageParser.parseMessage(content);
		args[0] = args[0].toUpperCase();
		return new CommandAttributes(channel, user, guild, member, args);
	}

	public get channel() {
		return this._Channel;
	}

	public get user() {
		return this._User;
	}

	public get guild() {
		return this._Guild;
	}

	public get member() {
		return this._Member;
	}

	public get args() {
		return this._Args;
	}
}

export class MalformedCommandError extends Error {
	private readonly _Command: RootCommandName;

	constructor(message: string, command: RootCommandName) {
		super(message);
		this._Command = command;
	}

	public get command() {
		return this._Command;
	}
}
