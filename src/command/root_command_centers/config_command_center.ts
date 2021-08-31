import { MessageEmbed } from 'discord.js';
import { inject, injectable, interfaces } from 'inversify';
import { container } from '../../inversify.config';
import { IGuild } from '../../models/guild';
import { getDefaultRaidConfig, IRaidConfig } from '../../models/raid_config';
import { GuildService } from '../../services/guild_service';
import { SetupService, SetupType } from '../../setup_service/generics/setup_service';
import { GuildConfigManagerService } from '../../setup_service/guild_config_manager_service';
import { RaidConfigManagerService } from '../../setup_service/raid_config_manager_service';
import { TYPES } from '../../types';
import { ClientTools } from '../../utils/client_tools';
import { GuildMessageCommand } from '../message_command';
import { BotPermission, RootCommandName, SubCommandName } from './interfaces/command_types';
import {
	RootCommandCenter,
	CommandParameters,
	MalformedCommandError,
	CommandAttributes,
} from './interfaces/root_command_center';

@injectable()
export class ConfigCommandCenter extends RootCommandCenter {
	public static readonly ROOT_COMMAND_NAME = RootCommandName.CONFIG;
	public static readonly MINIMUM_COMMAND_LENGTH = 2;
	public static readonly REQUIRED_SUB_COMMAND = true;
	public static readonly SUB_COMMANDS = [SubCommandName.GENERAL, SubCommandName.RAID];
	public static readonly REQUIRED_PERMISSIONS = [BotPermission.ADMIN];

	private readonly _GuildService: GuildService;

	public constructor(@inject(TYPES.GuildService) guildService: GuildService) {
		super();
		this._GuildService = guildService;
	}

	public get RootCommandName() {
		return ConfigCommandCenter.ROOT_COMMAND_NAME;
	}

	public get RequiredPermissions() {
		return ConfigCommandCenter.REQUIRED_PERMISSIONS;
	}

	private get guildService() {
		return this._GuildService;
	}

	public parse(attr: CommandAttributes): GuildMessageCommand<ConfigCommandCenter, ConfigCommandParameters> {
		const params = new ConfigCommandParameters(attr.args);
		const commandFunction =
			params.configType === 'general' ? this.createGuildConfigService : this.createRaidConfigService;
		return new GuildMessageCommand(this, attr.user, attr.channel, attr.guild, attr.member, params, commandFunction);
	}

	public static override help(embed: MessageEmbed): MessageEmbed {
		embed
			.setTitle('Config Help')
			.setDescription(
				'Used to edit Iris Bot settings for the entire server. This includes things like configuring ' +
					'ADMIN and MOD roles or the bot prefix. By using the `raid` subcommand i.e. `config raid`'
			);
		ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Command Usage', value: '`config general|raid`' },
			{ name: 'config', value: '`general` or `raid`' }
		);
		return embed;
	}

	/**
	 * Starts a SetupService for Guild basic configuration
	 * @param message message sent by User
	 */
	private async createGuildConfigService(
		command: GuildMessageCommand<ConfigCommandCenter, ConfigCommandParameters>
	): Promise<void> {
		const template = await command.rootCommand.guildService.findById(command.guild.id);
		const service = container.get<interfaces.Factory<SetupService<IGuild>>>(TYPES.SetupService)(
			SetupType.GuildConfig,
			command,
			template
		) as GuildConfigManagerService;
		service.startService();
	}

	/**
	 * Starts a SetupService for Guild raid configuration
	 * @param message message sent by User
	 */
	private async createRaidConfigService(
		command: GuildMessageCommand<ConfigCommandCenter, ConfigCommandParameters>
	): Promise<void> {
		const guildId = command.guild.id;
		let template;
		if (!(await command.rootCommand.guildService.raidConfigExistsById(guildId))) {
			template = getDefaultRaidConfig({ guildId: guildId });
		} else {
			template = await command.rootCommand.guildService.findRaidConfigById(guildId);
		}
		const service = container.get<interfaces.Factory<SetupService<IRaidConfig>>>(TYPES.SetupService)(
			SetupType.RaidConfig,
			command,
			template
		) as RaidConfigManagerService;
		service.startService();
	}
}

export class ConfigCommandParameters extends CommandParameters {
	private readonly _RootCommand = typeof ConfigCommandCenter;
	private readonly _ConfigType: 'general' | 'raid';

	public constructor(args: string[]) {
		super();
		if (args.length < ConfigCommandCenter.MINIMUM_COMMAND_LENGTH) {
			throw new MalformedCommandError(
				`Required at least **${ConfigCommandCenter.MINIMUM_COMMAND_LENGTH}** arguments but received **${args.length}**`,
				ConfigCommandCenter.ROOT_COMMAND_NAME
			);
		}

		args[1] = args[1].toLowerCase();
		if (args[1] === 'general' || args[1] === 'raid') {
			this._ConfigType = args[1];
		} else {
			throw new MalformedCommandError(
				`Subcommand must be either \`general\` or \`raid\` but received **${args[1]}**`,
				ConfigCommandCenter.ROOT_COMMAND_NAME
			);
		}
	}

	public get rootCommand() {
		return this._RootCommand;
	}

	public get configType() {
		return this._ConfigType;
	}
}
