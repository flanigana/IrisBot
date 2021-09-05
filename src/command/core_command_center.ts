import { Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { GuildService } from '../services/guild_service';
import { ClientTools } from '../utils/client_tools';
import { ConfigCommandCenter } from './config/config_command_center';
import { HelpCommandCenter } from './help_command_center';
import {
	CommandAttributes,
	CommandParameters,
	MalformedCommandError,
	RootCommandCenter,
} from './interfaces/root_command_center';
import Logger from '../utils/logging';
import { MessageCommand } from './message_command';
import { TYPES } from '../types';

@injectable()
export class CoreCommandCenter {
	private static readonly _ROOT_COMMAND_MAP: Map<string, RootCommandCenter> = new Map();
	private static readonly _ROOT_COMMAND_CENTERS: { [key: string]: RootCommandCenter } = {};

	private readonly _ClientTools: ClientTools;
	private readonly _GuildService: GuildService;

	public constructor(
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.GuildService) guildService: GuildService,
		@inject(TYPES.HelpCommandCenter) helpCommandCenter: HelpCommandCenter,
		@inject(TYPES.ConfigCommandCenter) configCommandCenter: ConfigCommandCenter
	) {
		this._ClientTools = clientTools;
		this._GuildService = guildService;

		// add command centers to collection
		CoreCommandCenter._ROOT_COMMAND_CENTERS['HelpCommandCenter'] = helpCommandCenter;
		CoreCommandCenter._ROOT_COMMAND_CENTERS['ConfigCommandCenter'] = configCommandCenter;
		Object.freeze(CoreCommandCenter._ROOT_COMMAND_CENTERS);

		// initialize the command map
		this.initCommandMap();
		Object.freeze(CoreCommandCenter._ROOT_COMMAND_MAP);
	}

	private initCommandMap(): void {
		for (const commandCenter of Object.values(CoreCommandCenter._ROOT_COMMAND_CENTERS)) {
			for (const commandName of commandCenter.RootCommands) {
				if (CoreCommandCenter._ROOT_COMMAND_MAP.has(commandName)) {
					const existingCenter = CoreCommandCenter._ROOT_COMMAND_MAP.get(commandName);
					throw new Error(
						`Duplicate CommandName, ${commandName}, found for both ${typeof existingCenter} ` +
							` and ${typeof commandCenter} during CoreCommandCenter initialization. ` +
							'This should not be possible and will cause errors when building commands'
					);
				}
				CoreCommandCenter._ROOT_COMMAND_MAP.set(commandName, commandCenter);
			}
		}
	}

	public dispatchFromMessage(message: Message): void {
		if (message.guild) {
			this.dispatchGuildCommand(message);
		} else {
			this.dispatchUserCommand(message);
		}
		return;
	}

	private async dispatchGuildCommand(message: Message): Promise<void> {
		const guildConfig = await this._GuildService.findById(message.guild.id);
		if (!message.content.startsWith(guildConfig.prefix)) {
			return;
		} else {
			message.content = message.content.substr(guildConfig.prefix.length);
		}
		const attr = CommandAttributes.fromMessage(message);
		this.dispatch(attr);
	}

	private dispatchUserCommand(message: Message): void {
		const attr = CommandAttributes.fromMessage(message);
		this.dispatch(attr);
	}

	private dispatch(attr: CommandAttributes): Promise<void> {
		const commandCenter = CoreCommandCenter._ROOT_COMMAND_MAP.get(attr.args[0]);

		if (!commandCenter) {
			this.checkForCloseCommand(attr);
			return;
		}

		let command: MessageCommand<RootCommandCenter, CommandParameters<RootCommandCenter>>;
		try {
			command = commandCenter.parse(attr);
			command.run();
		} catch (error) {
			if (error instanceof MalformedCommandError) {
				attr.channel.send({
					embeds: [HelpCommandCenter.malformedCommandHelp(this._ClientTools.getStandardEmbed(), error)],
				});
			} else if (error instanceof Error) {
				if (command) {
					Logger.error(
						`Unexpected Error While Running Command ${command.rootCommand} with args ${attr.args} -- Message: ${error.message}`,
						{ error: error }
					);
				} else {
					Logger.error(
						`Unexpected Error While Parsing Command in ${typeof commandCenter}: ${error.message}`,
						{ error: error }
					);
				}
			}
		}
	}

	private checkForCloseCommand(attr: CommandAttributes): void {
		const closest = HelpCommandCenter.findClosestCommands(attr.args[0]);
		if (closest.length === 0) {
			return;
		}
		attr.channel.send({
			embeds: [HelpCommandCenter.closeCommandHelp(this._ClientTools.getStandardEmbed(), attr.args[0], closest)],
		});
	}
}
