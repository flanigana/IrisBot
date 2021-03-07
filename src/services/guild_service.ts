import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { IGuild } from '../models/guild';
import { Guild, GuildMember } from 'discord.js';
import { GuildRepository } from '../data_access/repositories/guild_repository';

@injectable()
export class GuildService {

    private readonly _GuildRepo: GuildRepository;

    public constructor(
        @inject(TYPES.GuildRepository) guildRepo: GuildRepository
    ) {
        this._GuildRepo = guildRepo;
    }

    public isAdmin(guild: Guild, memberId: string): boolean {
        return true;
    }

    public isMod(guild: Guild, memberId: string): boolean {
        return true;
    }
    
    public isRaidLeader(guild: Guild, memberId: string): boolean {
        return true;
    }

    public isNitroBooster(guild: Guild, memberId: string): boolean {
        return true;
    }

    /**
     * Finds the GuildMember with the given id in the given Guild
     * @param guild Guild to search for member in
     * @param memberId id of the member to search for
     */
    public findGuildMember(guild: Guild, memberId: string): GuildMember {
        return guild.members.cache.find(m => (m.id === memberId));
    }

    /**
     * Returns the database document information for the Guild with the given id
     * @param id Guild id
     */
    public async findById(id: string): Promise<IGuild> {
        return this._GuildRepo.findById(id);
    }

    /**
     * Returns the database document information for all the Guilds in the database
     */
    public async findAll(): Promise<IGuild[]> {
        return this._GuildRepo.findAll();
    }

    /**
     * Validates that the guild has an existing database entry with all of the current fields required for the IGuild interface.
     * If the database document does not exist, it is created.
     * If the dabase document is missing fields, defaults are added for each missing field.
     * @param guild Discord Guild object to read information from
     */
    public async validateGuildDoc(guild: Guild): Promise<void> {
        const doc = await this._GuildRepo.findById(guild.id);
        const def = this.getDefaultGuildDoc(guild);
        if (doc) {
            for (const prop in def) {
                def[prop] = doc[prop];
            }
        }
        this._GuildRepo.save(def);
    }

    /**
     * Generates the default database document for a given Discord Guild
     * @param guild Discord Guild object to read information from
     */
    private getDefaultGuildDoc(guild: Guild): IGuild {
        return {
            _id: guild.id,
            name: guild.name,
            owner: guild.ownerID,
            prefix: '!',
            admins: [],
            mods: []
        };
    }

    /**
     * Generates an updated database document for a given Discord Guild
     * @param guild Discord Guild object to read information from
     */
    private async getUpdatedGuildDoc(guild: Guild): Promise<IGuild> {
        return this._GuildRepo.findById(guild.id).then((iguild) => {
            iguild.name = guild.name;
            iguild.owner = guild.ownerID;
            return iguild;
        });
    }
    
    /**
     * Creates or updates the given Guild in the database when changes occur to the Discord Guild object
     * @param guild Discord Guild object to read information from
     */
    public async saveDiscordGuild(guild: Guild): Promise<boolean> {
        return this._GuildRepo.existsById(guild.id).then(async (exists) => {
            let guildDoc;
            if (!exists) { // create Guild in database if it does not exist
                guildDoc = this.getDefaultGuildDoc(guild);
            } else { // update Guild in database
                guildDoc = await this.getUpdatedGuildDoc(guild);
            }
            return this._GuildRepo.save(guildDoc);
        });
    }

    /**
     * Updates the given Guild in the database when database-specific attributes have been changed
     * @param guild Guild object used to update existing entry in the database
     */
    public async save(guild: IGuild): Promise<boolean> {
        return this._GuildRepo.save(guild);
    }
}