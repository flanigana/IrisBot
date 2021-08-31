import { Guild, GuildMember, TextBasedChannels, User } from 'discord.js';
import { RootCommandCenter, CommandParameters } from './root_command_centers/interfaces/root_command_center';

export class MessageCommand<T extends RootCommandCenter, P extends CommandParameters> {
	private readonly _User: User;
	private readonly _Channel: TextBasedChannels;

	private readonly _RootCommand: T;
	private readonly _Parameters: P;
	private readonly _CommandFunction: (command: MessageCommand<T, P>) => void | Promise<void>;

	public constructor(
		rootCommand: T,
		user: User,
		originationChannel: TextBasedChannels,
		parameters: P,
		commandFunction: (command: MessageCommand<T, P>) => void | Promise<void>
	) {
		this._RootCommand = rootCommand;
		this._User = user;
		this._Channel = originationChannel;
		this._Parameters = parameters;
		this._CommandFunction = commandFunction;
	}

	public get user() {
		return this._User;
	}

	public get channel() {
		return this._Channel;
	}

	public get rootCommand() {
		return this._RootCommand;
	}

	public get parameters() {
		return this._Parameters;
	}

	public run(): void | Promise<void> {
		this._CommandFunction(this);
	}
}

export class GuildMessageCommand<T extends RootCommandCenter, P extends CommandParameters> extends MessageCommand<
	T,
	P
> {
	private readonly _Guild: Guild;
	private readonly _Member: GuildMember;

	public constructor(
		rootCommand: T,
		author: User,
		originationChannel: TextBasedChannels,
		guild: Guild,
		guildMember: GuildMember,
		parameters: P,
		commandFunction: (command: GuildMessageCommand<T, P>) => void | Promise<void>
	) {
		super(rootCommand, author, originationChannel, parameters, commandFunction);
		this._Guild = guild;
		this._Member = guildMember;
	}

	public get guild() {
		return this._Guild;
	}

	public get member() {
		return this._Member;
	}
}
