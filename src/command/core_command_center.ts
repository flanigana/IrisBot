import { Message } from 'discord.js';
import { inject, injectable } from 'inversify';
import { GuildService } from '../services/guild_service';
import { TYPES } from '../types';
import { ClientTools } from '../utils/client_tools';
import { RootCommandName } from './root_command_centers/interfaces/command_types';
import { ConfigCommandCenter } from './root_command_centers/config_command_center';
import { HelpCommandCenter } from './root_command_centers/help_command_center';
import {
	CommandAttributes,
	CommandParameters,
	MalformedCommandError,
	RootCommandCenter,
} from './root_command_centers/interfaces/root_command_center';
import Logger from '../utils/logging';
import { MessageCommand } from './message_command';

@injectable()
export class CoreCommandCenter {
	private static readonly _ROOT_COMMANDS: Map<string, RootCommandCenter> = new Map();

	private readonly _ClientTools: ClientTools;
	private readonly _GuildService: GuildService;

	public constructor(
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.GuildService) guildService: GuildService,
		@inject(TYPES.ConfigCommandCenter) configCommandCenter: ConfigCommandCenter,
		@inject(TYPES.HelpCommandCenter) helpCommandCenter: HelpCommandCenter
	) {
		this._ClientTools = clientTools;
		this._GuildService = guildService;
		CoreCommandCenter._ROOT_COMMANDS.set(RootCommandName.CONFIG, configCommandCenter);
		CoreCommandCenter._ROOT_COMMANDS.set(RootCommandName.HELP, helpCommandCenter);
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
		const commandCenter = CoreCommandCenter._ROOT_COMMANDS.get(attr.args[0]);

		if (!commandCenter) {
			this.checkForCloseCommand(attr);
			return;
		}

		let command: MessageCommand<RootCommandCenter, CommandParameters>;
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
						`Unexpected Error While Parsing Command in ${commandCenter.RootCommandName}: ${error.message}`,
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
