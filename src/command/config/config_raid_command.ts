import { GuildMessageCommand } from '../message_command';
import { ConfigCommandCenter, ConfigCommandParameters } from './config_command_center';
import { BotPermission, RootCommandName } from '../interfaces/command_types';
import { CommandAttributes, SubCommandCenter } from '../interfaces/root_command_center';
import { MessageEmbed } from 'discord.js';
import { injectable } from 'inversify';

@injectable()
export class RaidConfigCommandCenter extends SubCommandCenter<ConfigCommandCenter> {
	protected readonly _RootCommands: RootCommandName[] = [RootCommandName.CONFIG];
	protected readonly _MinimumCommandLength = 2;
	protected readonly _SubCommands = [];
	protected readonly _RequiredPermissions = [BotPermission.ADMIN];

	public constructor() {
		super();
	}

	public parse(attr: CommandAttributes): GuildMessageCommand<RaidConfigCommandCenter, ConfigCommandParameters> {
		throw new Error('Method not implemented.');
	}

	public static override help(embed: MessageEmbed): MessageEmbed {
		return embed;
	}
}
