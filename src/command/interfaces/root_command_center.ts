import { Guild, GuildMember, Message, MessageEmbed, TextBasedChannels, User } from 'discord.js';
import { fluentProvide } from 'inversify-binding-decorators';
import { EmbedField } from '../../utils/client_tools';
import { MessageParser } from '../../utils/message_parser';
import { MessageCommand } from '../message_command';
import { BotPermission, CommandName, RootCommandName } from './command_types';

@(fluentProvide(RootCommandCenter).inSingletonScope().done())
export abstract class RootCommandCenter {
	protected abstract readonly _RootCommands: RootCommandName[];
	protected abstract readonly _MinimumCommandLength: number;
	protected abstract readonly _SubCommands: CommandName[];
	protected abstract readonly _RequiredPermissions: BotPermission[];

	public static readonly ALL_HELP_FIELD: EmbedField = {
		name: 'For More General Help',
		value: 'Use the `help` command to get more general help and learn how to use command parameters',
	};

	public abstract parse(
		attr: CommandAttributes
	): MessageCommand<RootCommandCenter, CommandParameters<RootCommandCenter>>;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public static help(embed: MessageEmbed, subcommand?: CommandName): MessageEmbed {
		throw new Error('Method not implemented.');
	}

	public get RootCommands(): RootCommandName[] {
		return this._RootCommands;
	}
	public get MinimumCommandLength(): number {
		return this._MinimumCommandLength;
	}
	public get SubCommands(): CommandName[] {
		return this._SubCommands;
	}
	public get RequiredPermissions(): BotPermission[] {
		return this._RequiredPermissions;
	}
}

export abstract class SubCommandCenter<T extends RootCommandCenter> extends RootCommandCenter {
	protected _ParentCommandCenter: T;

	public get ParentCommandCenter() {
		return this._ParentCommandCenter;
	}

	public set ParentCommandCenter(parent: T) {
		if (this._ParentCommandCenter) {
			throw new Error('Parent CommandCenter already set. Relinking should not happen.');
		}
		this._ParentCommandCenter = parent;
	}
}

export abstract class CommandParameters<T extends RootCommandCenter> {
	protected readonly _RootCommand: T;
	protected readonly _Length: number;

	public constructor(commandCenter: T, args: string[]) {
		this._RootCommand = commandCenter;
		this._Length = args.length;
		if (args.length < commandCenter.MinimumCommandLength) {
			throw new MalformedCommandError(
				`Required at least **${commandCenter.MinimumCommandLength}** arguments but received **${args.length}**`,
				RootCommandName.CONFIG
			);
		}
	}

	public get RootCommand() {
		return this._RootCommand;
	}

	public get length() {
		return this._Length;
	}
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
