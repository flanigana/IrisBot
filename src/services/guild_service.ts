import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { Guild, IGuild } from '../models/guild';
import { Guild as DiscordGuild } from 'discord.js';
import { GuildRepository } from '../data_access/repositories/guild_repository';

@injectable()
export class GuildService {

    private readonly _guildRepo: GuildRepository;

    public constructor(
        @inject(TYPES.GuildRepository) guildRepo: GuildRepository
    ) {
        this._guildRepo = guildRepo;
    }
    
    /**
     * updateGuild
     */
    public async save(guild: DiscordGuild): Promise<IGuild> {
        let guildDoc = Guild.build({
            _id: guild.id,
            name: guild.name,
            owner: guild.ownerID,
            prefix: '!'
        });
        return this._guildRepo.save(guildDoc);
    }
}