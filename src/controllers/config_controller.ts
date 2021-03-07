import { Message } from 'discord.js';
import { inject, injectable, interfaces } from 'inversify';
import { GuildService } from '../services/guild_service';
import { TYPES } from '../types';
import logger from '../../winston';
import container from '../../inversify.config';
import { SetupService } from '../services/setup_service/setup_service';
import { IGuild } from '../models/guild';
import { SetupType } from '../services/setup_service/setup_type';
import { GuildConfigService } from '../services/setup_service/guild_config_service';

@injectable()
export class ConfigController {

    private readonly _GuildService: GuildService;

    public constructor(
        @inject(TYPES.GuildService) guildService: GuildService
    ) {
        this._GuildService = guildService;
    }

    private async createGuildConfigService(message: Message): Promise<void> {
        const template = await this._GuildService.findById(message.guild.id);
        logger.debug('Guild:%s|%s - User:%s|%s started GuildConfigService.', message.guild.id, message.guild.name, message.author.id, message.author.username);
        const service = container.get<interfaces.Factory<SetupService<IGuild>>>(TYPES.SetupService)(SetupType.GuildConfig, message, template) as GuildConfigService;
        service.startService();
    }

    public handleMessage(message: Message, args: string[]): void {
        if (args.length < 2) {
            return;
        }
        switch (args[1].toLowerCase()) {
            case 'general': // config general
                this.createGuildConfigService(message);
                break;
            case 'raid': // config raid
                break;
        }
    }
}