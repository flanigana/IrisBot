import { Message } from 'discord.js';
import { inject, injectable, interfaces } from 'inversify';
import { GuildService } from '../services/guild_service';
import { TYPES } from '../types';
import Logger from '../utilities/logging';
import container from '../../inversify.config';
import { SetupService, SetupType } from '../setup_service/generics/setup_service';
import { IGuild } from '../models/guild';
import { GuildConfigManagerService } from '../setup_service/guild_config_manager_service';
import { getDefaultRaidConfig, IRaidConfig } from '../models/raid_config';
import { RaidConfigManagerService } from '../setup_service/raid_config_manager_service';

@injectable()
export class ConfigController {

    private readonly _GuildService: GuildService;

    public constructor(
        @inject(TYPES.GuildService) guildService: GuildService
    ) {
        this._GuildService = guildService;
    }

    /**
     * Starts a SetupService for Guild basic configuration
     * @param message message sent by User
     */
    private async createGuildConfigService(message: Message): Promise<void> {
        const template = await this._GuildService.findById(message.guild.id);
        const service = container.get<interfaces.Factory<SetupService<IGuild>>>(TYPES.SetupService)(SetupType.GuildConfig, message, template) as GuildConfigManagerService;
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
            template = getDefaultRaidConfig({guildId: guildId});
        } else {
            template = await this._GuildService.findRaidConfigById(guildId);
        }
        const service = container.get<interfaces.Factory<SetupService<IRaidConfig>>>(TYPES.SetupService)(SetupType.RaidConfig, message, template) as RaidConfigManagerService;
        service.startService();
    }

    public handleMessage(message: Message, args: string[]): void {
        if (args.length < 2) {
            return;
        }
        switch (args[1].toUpperCase()) {
            case 'GENERAL':     // config general
                this.createGuildConfigService(message);
                break;
            case 'RAID':        // config raid
                this.createRaidConfigService(message);
                break;
        }
    }
}