import { MessageEmbed } from 'discord.js';
import { inject, injectable } from 'inversify';
import { GuildService } from '../../services/guild_service';
import { ClientTools } from '../../utils/client_tools';
import { GuildMessageCommand } from '../message_command';
import { BotPermission, CommandName, RootCommandName, SubCommandName } from '../interfaces/command_types';
import {
	RootCommandCenter,
	CommandParameters,
	MalformedCommandError,
	CommandAttributes,
} from '../interfaces/root_command_center';
import { RaidConfigCommandCenter } from './config_raid_command';
import { TYPES } from '../../types';

@injectable()
export class ConfigCommandCenter extends RootCommandCenter {
	protected _RootCommands: RootCommandName[] = [RootCommandName.CONFIG];
	protected _MinimumCommandLength = 2;
	protected _SubCommands: CommandName[] = [SubCommandName.GENERAL, SubCommandName.RAID];
	protected _RequiredPermissions: BotPermission[] = [BotPermission.ADMIN];

	private readonly _RaidConfigCommandCenter: RaidConfigCommandCenter;
	private readonly _GuildService: GuildService;

	public constructor(
		@inject(TYPES.RaidConfigCommandCenter) raidConfig: RaidConfigCommandCenter,
		@inject(TYPES.GuildService) guildService: GuildService
	) {
		super();
		this._RaidConfigCommandCenter = raidConfig;
		this._GuildService = guildService;
		raidConfig.ParentCommandCenter = this;
	}

	public parse(attr: CommandAttributes): GuildMessageCommand<ConfigCommandCenter, ConfigCommandParameters> {
		const params = new ConfigCommandParameters(this, attr.args);
		const commandFunction =
			params.configType === 'general'
				? this._GuildService.startGuildConfigSetup
				: this._GuildService.startRaidConfigSetup;
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
}

export class ConfigCommandParameters extends CommandParameters<ConfigCommandCenter> {
	private readonly _ConfigType: 'general' | 'raid';

	public constructor(commandCenter: ConfigCommandCenter, args: string[]) {
		super(commandCenter, args);

		args[1] = args[1].toLowerCase();
		if (args[1] === 'general' || args[1] === 'raid') {
			this._ConfigType = args[1];
		} else {
			throw new MalformedCommandError(
				`Subcommand must be either \`general\` or \`raid\` but received **${args[1]}**`,
				RootCommandName.CONFIG
			);
		}
	}

	public get configType() {
		return this._ConfigType;
	}
}
