import { Message } from 'discord.js';
import { inject, injectable, interfaces } from 'inversify';
import { GuildService } from '../services/guild_service';
import { TYPES } from '../types';
import { container } from '../inversify.config';
import { InteractiveSetup, SetupType } from '../setup_service/generics/interactive_setup';
import { IGuild } from '../models/guild';
import { GuildConfigSetup } from '../setup_service/guild_config_setup';
import { getDefaultRaidConfig, IRaidConfig } from '../models/raid_config';
import { RaidConfigSetup } from '../setup_service/raid_config_setup';

@injectable()
export class ConfigController {
	private readonly _GuildService: GuildService;

	public constructor(@inject(TYPES.GuildService) guildService: GuildService) {
		this._GuildService = guildService;
	}

	/**
	 * Starts a SetupService for Guild basic configuration
	 * @param message message sent by User
	 */
	private async createGuildConfigService(message: Message): Promise<void> {
		const template = await this._GuildService.findById(message.guild.id);
		const service = container.get<interfaces.Factory<InteractiveSetup<IGuild>>>(TYPES.SetupService)(
			SetupType.GuildConfig,
			message,
			template
		) as GuildConfigSetup;
		service.startService();
	}

	/**
	 * Starts a SetupService for Guild raid configuration
	 * @param message message sent by User
	 */
	private async createRaidConfigService(message: Message): Promise<void> {
		const guildId = message.guild.id;
		let template;
		if (!(await this._GuildService.raidConfigExistsById(guildId))) {
			template = getDefaultRaidConfig({ guildId: guildId });
		} else {
			template = await this._GuildService.findRaidConfigById(guildId);
		}
		const service = container.get<interfaces.Factory<InteractiveSetup<IRaidConfig>>>(TYPES.SetupService)(
			SetupType.RaidConfig,
			message,
			template
		) as RaidConfigSetup;
		service.startService();
	}

	public handleMessage(message: Message, args: string[]): void {
		if (args.length < 2) {
			return;
		}
		switch (args[1].toUpperCase()) {
			case 'GENERAL': // config general
				this.createGuildConfigService(message);
				break;
			case 'RAID': // config raid
				this.createRaidConfigService(message);
				break;
		}
	}
}
