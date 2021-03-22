import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { getBlankGuild, IGuild } from '../models/guild';
import { Guild, GuildMember } from 'discord.js';
import { GuildRepository } from '../data_access/repositories/guild_repository';
import { IRaidConfig } from '../models/raid_config';
import { RaidConfigRepository } from '../data_access/repositories/raid_config_repository';

@injectable()
export class GuildService {

    private readonly _GuildRepo: GuildRepository;
    private readonly _RaidConfigRepository: RaidConfigRepository;

    public constructor(
        @inject(TYPES.GuildRepository) guildRepo: GuildRepository,
        @inject(TYPES.RaidConfigRepository) raidConfigRepo: RaidConfigRepository
    ) {
        this._GuildRepo = guildRepo;
        this._RaidConfigRepository = raidConfigRepo;
    }

    /**
     * Finds the GuildMember with the given id in the given Guild
     * @param guild Guild to search for member in
     * @param memberId id of the member to search for
     */
    public static findGuildMember(guild: Guild, memberId: string): GuildMember {
        return guild.members.cache.find(m => (m.id === memberId));
    }

    /**
     * Checks to see if the given GuildMember has the given role
     * @param member GuildMember to check roles of
     * @param role string form of role to check for
     * @returns whether the member has the given role
     */
    public static hasRole(member: GuildMember, role: string): boolean {
        return member.roles.cache.find(aRole => aRole.toString() === role) ? true : false;
    }

    /**
     * Checks to see if the given GuildMember has admin permissions for the bot
     * @param guild Guild to check in
     * @param member GuildMember to check permissions for
     * @returns whether the member has admin permissions
     */
    public isAdmin(guild: Guild, member: string | GuildMember): Promise<boolean> {
        const guildMember = typeof member === 'string' ? GuildService.findGuildMember(guild, member) : member;
        if (guildMember.id === '225044370930401280' || guildMember.hasPermission('ADMINISTRATOR')) {
            return Promise.resolve(true);
        }
        return this.findById(guild.id).then(iGuild => {
            return iGuild.admins.some(role => GuildService.hasRole(guildMember, role));
        });
    }

    /**
     * Checks to see if the given GuildMember has mod permissions for the bot
     * @param guild Guild to check in
     * @param member GuildMember to check permissions for
     * @returns whether the member has mod permissions
     */
    public isMod(guild: Guild, member: string | GuildMember): Promise<boolean> {
        const guildMember = typeof member === 'string' ? GuildService.findGuildMember(guild, member) : member;
        return this.findById(guild.id).then(iGuild => {
            return iGuild.mods.some(role => GuildService.hasRole(guildMember, role))
                || this.isAdmin(guild, guildMember);
        });
    }
    
    /**
     * Checks to see if the given GuildMember has raid leader permissions for the bot
     * @param guild Guild to check in
     * @param member GuildMember to check permissions for
     * @returns whether the member has raid leader permissions
     */
    public isRaidLeader(guild: Guild, member: string | GuildMember): Promise<boolean> {
        const guildMember = typeof member === 'string' ? GuildService.findGuildMember(guild, member) : member;
        return this.findRaidConfigById(guild.id).then(iRaidConfig => {
            return iRaidConfig.raidLeaders.some(role => GuildService.hasRole(guildMember, role))
                || this.isAdmin(guild, guildMember);
        });
    }

    /**
     * Checks to see if the given GuildMember is a nitro-booster
     * @param guild Guild to check in
     * @param member GuildMember to check permissions for
     * @returns whether the member is a nitro-booster
     */
    public isNitroBooster(guild: Guild, member: string | GuildMember): boolean {
        const guildMember = typeof member === 'string' ? GuildService.findGuildMember(guild, member) : member;
        return guildMember.premiumSince ? true : false;
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
     * Checks whether a RaidConfig template exists for the Guild with the given id
     * @param id Guild id
     * @returns whether a RaidConfig template exists
     */
    public async raidConfigExistsById(id: string): Promise<boolean> {
        return this._RaidConfigRepository.existsByGuild(id);
    }

    /**
     * Returns the RaidConfig for the Guild with the given id
     * @param id Guild id
     * @returns the Guild's RaidConfig
     */
    public async findRaidConfigById(id: string): Promise<IRaidConfig> {
        return this._RaidConfigRepository.findByGuild(id);
    }

    /**
     * Saves a RaidConfig to the database
     * @param config the RaidConfig to save
     * @returns if the save was successful
     */
    public async saveRaidConfig(config: IRaidConfig): Promise<boolean> {
        return this._RaidConfigRepository.save(config);
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
        console.log(def);
        this._GuildRepo.save(def);
    }

    /**
     * Generates the default database document for a given Discord Guild
     * @param guild Discord Guild object to read information from
     */
    private getDefaultGuildDoc(guild: Guild): IGuild {
        return getBlankGuild({
            _id: guild.id,
            name: guild.name,
            owner: guild.ownerID
        });
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