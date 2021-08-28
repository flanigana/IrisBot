import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { getBlankGuild, IGuild } from '../models/guild';
import { Guild, GuildMember } from 'discord.js';
import { GuildRepository } from '../data_access/repositories/guild_repository';
import { IRaidConfig } from '../models/raid_config';
import { RaidConfigRepository } from '../data_access/repositories/raid_config_repository';
import { ClientTools } from '../utils/client_tools';

@injectable()
export class GuildService {
	private readonly _GuildRepo: GuildRepository;
	private readonly _RaidConfigRepo: RaidConfigRepository;

	public constructor(
		@inject(TYPES.GuildRepository) guildRepo: GuildRepository,
		@inject(TYPES.RaidConfigRepository) raidConfigRepo: RaidConfigRepository
	) {
		this._GuildRepo = guildRepo;
		this._RaidConfigRepo = raidConfigRepo;
	}

	/**
	 * Checks to see if the given GuildMember has the given role
	 * @param member GuildMember to check roles of
	 * @param role string form of role to check for
	 * @returns whether the member has the given role
	 */
	public static hasRole(member: GuildMember, role: string): boolean {
		return member.roles.cache.find((aRole) => aRole.toString() === role) ? true : false;
	}

	/**
	 * Checks to see if the given GuildMember has admin permissions for the bot
	 * @param guild Guild to check in
	 * @param member GuildMember to check permissions for
	 * @returns whether the member has admin permissions
	 */
	public async isAdmin(guild: Guild, member: string | GuildMember): Promise<boolean> {
		const guildMember = typeof member === 'string' ? await ClientTools.findGuildMember(guild, member) : member;
		if (guildMember.id === '225044370930401280' || guildMember.permissions.has('ADMINISTRATOR')) {
			return Promise.resolve(true);
		}
		return this.findById(guild.id).then((iGuild) => {
			return iGuild.admins.some((role) => GuildService.hasRole(guildMember, role));
		});
	}

	/**
	 * Checks to see if the given GuildMember has mod permissions for the bot
	 * @param guild Guild to check in
	 * @param member GuildMember to check permissions for
	 * @param strict if enables, will not do a cascading check of higher permissions
	 * @returns whether the member has mod permissions
	 */
	public async isMod(guild: Guild, member: string | GuildMember, strict = false): Promise<boolean> {
		const guildMember = typeof member === 'string' ? await ClientTools.findGuildMember(guild, member) : member;
		return this.findById(guild.id).then(async (iGuild) => {
			return iGuild.mods.some((role) => GuildService.hasRole(guildMember, role))
				? true
				: !strict
				? await this.isAdmin(guild, guildMember)
				: false;
		});
	}

	/**
	 * Checks to see if the given GuildMember has raid leader permissions for the bot
	 * @param guild Guild to check in
	 * @param member GuildMember to check permissions for
	 * @param strict if enabled, will not do a cascading check of higher permissions
	 * @returns whether the member has raid leader permissions
	 */
	// TODO: Check if IRaidConfig exists and send help message if not.
	public async isRaidLeader(guild: Guild, member: string | GuildMember, strict = false): Promise<boolean> {
		const guildMember = typeof member === 'string' ? await ClientTools.findGuildMember(guild, member) : member;
		return this.findRaidConfigById(guild.id).then(async (iRaidConfig) => {
			return iRaidConfig?.raidLeaders.some((role) => GuildService.hasRole(guildMember, role))
				? true
				: !strict
				? await this.isAdmin(guild, guildMember)
				: false;
		});
	}

	/**
	 * Checks to see if the given GuildMember is a nitro-booster
	 * @param guild Guild to check in
	 * @param member GuildMember to check permissions for
	 * @returns whether the member is a nitro-booster
	 */
	public async isNitroBooster(guild: Guild, member: string | GuildMember): Promise<boolean> {
		const guildMember = typeof member === 'string' ? await ClientTools.findGuildMember(guild, member) : member;
		return guildMember.premiumSince ? true : false;
	}

	/**
	 * Returns the database document information for the Guild with the given id
	 * @param guildId Guild id
	 */
	public async findById(guildId: string): Promise<IGuild> {
		return this._GuildRepo.findByGuildId(guildId);
	}

	/**
	 * Returns the display name of the Guild in Discords given an id
	 * @param guildId Guild id
	 */
	public async findGuildName(guildId: string): Promise<string> {
		if (!this._GuildRepo.existsByGuildId(guildId)) {
			return;
		}
		return this._GuildRepo.findByGuildId(guildId).then((g) => {
			return g.name;
		});
	}

	/**
	 * Returns the database document information for all the Guilds in the database
	 */
	public async findAll(): Promise<IGuild[]> {
		return this._GuildRepo.findAll();
	}

	/**
	 * Checks whether a RaidConfig template exists for the Guild with the given id
	 * @param guildID Guild id
	 * @returns whether a RaidConfig template exists
	 */
	public async raidConfigExistsById(guildID: string): Promise<boolean> {
		return this._RaidConfigRepo.existsByGuildId(guildID);
	}

	/**
	 * Returns the RaidConfig for the Guild with the given id
	 * @param guildId Guild id
	 * @returns the Guild's RaidConfig
	 */
	public async findRaidConfigById(guildId: string): Promise<IRaidConfig> {
		return this._RaidConfigRepo.findByGuildId(guildId);
	}

	/**
	 * Saves a RaidConfig to the database
	 * @param config the RaidConfig to save
	 * @returns if the save was successful
	 */
	public async saveRaidConfig(config: IRaidConfig): Promise<IRaidConfig> {
		return this._RaidConfigRepo.save(config);
	}

	/**
	 * Returns a guaranteed IGuild. If one exists in the database, it will be returned. If not, a new one will be created, saved, and returned.
	 * @param guild Discord Guild object to read information from
	 */
	public async safeFindGuild(guild: Guild): Promise<IGuild> {
		if (await this._GuildRepo.existsByGuildId(guild.id)) {
			return this._GuildRepo.findByGuildId(guild.id);
		} else {
			const iGuild = this.getDefaultGuild(guild);
			await this._GuildRepo.save(iGuild);
			return iGuild;
		}
	}

	/**
	 * Generates the default database document for a given Discord Guild
	 * @param guild Discord Guild object to read information from
	 */
	private getDefaultGuild(guild: Guild): IGuild {
		return getBlankGuild({
			guildId: guild.id,
			name: guild.name,
			owner: guild.ownerId,
		});
	}

	/**
	 * Generates an updated database document for a given Discord Guild
	 * @param guild Discord Guild object to read information from
	 */
	private async getUpdatedGuild(guild: Guild): Promise<IGuild> {
		return this._GuildRepo.findByGuildId(guild.id).then((iguild) => {
			iguild.name = guild.name;
			iguild.owner = guild.ownerId;
			return iguild;
		});
	}

	/**
	 * Creates or updates the given Guild in the database when changes occur to the Discord Guild object
	 * @param guild Discord Guild object to read information from
	 */
	public async saveDiscordGuild(guild: Guild): Promise<IGuild> {
		return this._GuildRepo.existsByGuildId(guild.id).then(async (exists) => {
			let guildDoc;
			if (!exists) {
				// create Guild in database if it does not exist
				guildDoc = this.getDefaultGuild(guild);
			} else {
				// update Guild in database
				guildDoc = await this.getUpdatedGuild(guild);
			}
			return this._GuildRepo.save(guildDoc);
		});
	}

	/**
	 * Updates the given Guild in the database when database-specific attributes have been changed
	 * @param guild Guild object used to update existing entry in the database
	 */
	public async save(guild: IGuild): Promise<IGuild> {
		return this._GuildRepo.save(guild);
	}
}
