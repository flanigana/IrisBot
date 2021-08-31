import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Client, Guild, GuildEmoji, GuildMember, MessageEmbed } from 'discord.js';

@injectable()
export class ClientTools {
	private readonly _BotGuilds = new Set([
		'710578568211464192',
		'708761992705474680',
		'711504382394630194',
		'711491483588493313',
	]);
	private static readonly _EmojiTypes = ['Portal', 'Key', 'Class', 'Ability'];
	private static readonly _MAX_FIELD_LENGTH = 1021;

	public static readonly LINE_BREAK_FIELD: EmbedField = {
		name: '--------------------------------------------------------------------------------------------------',
		value: '-----------------------------------------------------------------------------------------------',
	};

	private readonly _Client: Client;

	public constructor(@inject(TYPES.Client) client: Client) {
		this._Client = client;
	}

	/**
	 * Finds the GuildMember with the given id in the given Guild
	 * @param guild Guild to search for member in
	 * @param memberId id of the user to search for
	 */
	public static async findGuildMember(guild: Guild, memberId: string): Promise<GuildMember> {
		return guild.members.fetch({ user: memberId });
	}

	/**
	 * Finds the GuildMember with the given id in the Guild with the given id
	 * @param guildId id of Guild to serach for member in
	 * @param memberId id of the user to search for
	 * @returns
	 */
	public async findGuildMember(guildId: string, memberId: string): Promise<GuildMember> {
		return this.findGuild(guildId).then((g) => ClientTools.findGuildMember(g, memberId));
	}

	/**
	 * Returns the Discord Guild with the given id
	 * @param guildId id of Guild
	 */
	public async findGuild(guildId: string): Promise<Guild> {
		return this._Client.guilds.fetch({ guild: guildId });
	}

	/**
	 * Returns the standard, styled embed to add to
	 */
	public getStandardEmbed(): MessageEmbed {
		return new MessageEmbed()
			.setColor('#7542d4')
			.setFooter('Iris Bot', this._Client.user.avatarURL())
			.setTimestamp();
	}

	/**
	 * Adds a field to a `MessageEmbed`. Checks that the value is not empty first to avoid errors.
	 * @param embed `MessageEmbed` to add field to
	 * @param name name of the field
	 * @param value value for the field
	 * @param options `FieldOptions` to use for field
	 */
	public static addFieldToEmbed(
		embed: MessageEmbed,
		name: string,
		value: any,
		options?: Partial<FieldOptions>
	): MessageEmbed {
		if (options?.default && typeof options.default === 'string' && options.default === '') {
			// used to act as a blank space, otherwise Discord will throw an error on an empty field
			// but using the empty hyperlink syntax let's you send a 'blank' field
			options.default = '[]()';
		}
		const opts = Object.assign(
			{
				inline: false,
				default: undefined,
				separator: ', ',
				continueWhenOver: false,
			},
			options
		);

		let str = '';
		if (Array.isArray(value)) {
			str = value.join(opts.separator);
		} else {
			str = `${value}`;
		}
		if (!str || str.trim().length === 0) {
			if (opts.default) {
				str = opts.default;
			} else {
				return embed;
			}
		}

		if (str.length >= this._MAX_FIELD_LENGTH) {
			if (!options.continueWhenOver) {
				str = str.substr(0, this._MAX_FIELD_LENGTH) + '...';
			} else {
				for (let startPos = 0; startPos < str.length; startPos += this._MAX_FIELD_LENGTH + 1) {
					let endPos = startPos + this._MAX_FIELD_LENGTH;
					endPos = endPos > str.length - 1 ? str.length - 1 : endPos;

					const fieldName =
						startPos === 0 ? name : `${name} Cont ${Math.floor(startPos / this._MAX_FIELD_LENGTH)}`;
					embed.addField(fieldName, str.substring(startPos, endPos));
				}
				return embed;
			}
		}

		return embed.addField(name, str, opts.inline);
	}

	/**
	 * Adds the given EmbedFields to a MessageEmbed. Checks that the value is not empty first to avoid errors.
	 * @param embed MessageEmbed to add field to
	 * @param fields list of EmbedFields to add to embed
	 */
	public static addFieldsToEmbed(embed: MessageEmbed, ...fields: EmbedField[]): MessageEmbed {
		for (const { name, value, options } of fields) {
			this.addFieldToEmbed(embed, name, value, options);
		}
		return embed;
	}

	/**
	 * Adds a separating line break of -'s in the embed to either create a visual break or clear space for a new set of inlines.
	 * @param embed MessageEmbed to add break to
	 */
	public static addLineBreakFieldToEmbed(embed: MessageEmbed): MessageEmbed {
		this.addFieldsToEmbed(embed, ClientTools.LINE_BREAK_FIELD);
		return embed;
	}

	/**
	 * Adds all of the available emojis to the given embed.
	 * If a Guild id is provided, it will include emojis from that Guild.
	 * Otherwise, only emojis available in the bot's default Guilds will be added
	 * @param embed MessageEmbed to add emojis to
	 * @param guildId id of the Guild to include emojis from
	 */
	public addClientEmojisToEmbed(embed: MessageEmbed, guildId?: string): MessageEmbed {
		const availableEmojiList = this.createClientEmojisList(guildId);
		for (const type in availableEmojiList) {
			ClientTools.addFieldToEmbed(embed, type, availableEmojiList[type]);
		}
		return embed;
	}

	/**
	 * Adds all of the emojis from the given list to the given embed.
	 * @param embed MessageEmbed to add emojis to
	 * @param emojiList object containing emojis to add to the embed
	 */
	public static addEmojiListToEmbed(embed: MessageEmbed, emojiList: any): MessageEmbed {
		for (const type in emojiList) {
			this.addFieldToEmbed(embed, type, emojiList[type]);
		}
		return embed;
	}

	/**
	 * Returns an instance of a Discord Guild given its id
	 * @param guildId id of desired guild
	 */
	public getDiscordGuildById(guildId: string): Guild {
		return this._Client.guilds.cache.get(guildId);
	}

	/**
	 * Checks a string to see if it is a unicode emoji
	 * @param emojiName emoji string
	 */
	public static isUnicodeEmoji(emojiName: string): boolean {
		const emojiRanges = [
			'(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])', // U+1F680 to U+1F6FF
		];
		if (emojiName.match(emojiRanges.join('|'))) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Returns a GuildEmoji given its name and the id of its owning Guild. The bot's default Guilds will also be checked,
	 * but the given Guild id will be prioritized in case there are emojis with identicle names.
	 * @param emojiName name of emoji
	 * @param guildId id of guild to check for emoji
	 */
	public getGuildEmoji(emojiName: string, guildId?: string): GuildEmoji {
		const matchedEmojis = this._Client.emojis.cache.filter(
			({ name, guild }) => name === emojiName && (this._BotGuilds.has(guild.id) || guild.id === guildId)
		);
		if (matchedEmojis.size === 0) {
			return undefined;
		} else if (matchedEmojis.size > 1) {
			let emoji;
			if (guildId) {
				emoji = matchedEmojis.find(({ guild }) => guildId === guild.id);
			}
			if (!emoji) {
				return matchedEmojis.first();
			}
		} else {
			return matchedEmojis.first();
		}
	}

	/**
	 * Attempts to return an emoji based on the string. If it is a unicode emoji, the string is returned; otherwise, it is searched for within the given Guild
	 * or one of the default bot Guilds.
	 * @param emojiName emoji string
	 * @param guildId id of guild to check for emoji
	 */
	public getEmoji(emojiName: string, guildId?: string): string | GuildEmoji {
		const fullEmoji = new RegExp(/<:?(\w*):?(\d+)?>/);
		if (ClientTools.isUnicodeEmoji(emojiName)) {
			return emojiName;
		}
		const match = fullEmoji.exec(emojiName); // ['<:emojiName:id>', 'emojiName', 'id']
		if (match && match[2]) {
			// full emoji given, check that it exists in the available Guilds
			const emoji = this._Client.emojis.cache.get(match[2]);
			if (this._BotGuilds.has(emoji?.guild.id) || emoji?.guild.id === guildId) {
				return emoji;
			}
		}
		return match ? this.getGuildEmoji(match[1], guildId) : this.getGuildEmoji(emojiName, guildId);
	}

	/**
	 * Replaces all instances of <emojiName> in a string with the GuildEmoji available to the bot.
	 * Does not replace with any emojis belonging to any Guild that is not one of the bot's Guild's
	 * @param message string to replace with GuildEmojis
	 */
	public replaceWithEmojis(message: string, guildId?: string): string {
		return message.replace(/<\w*>/g, (match: string) => {
			return `${this.getEmoji(match, guildId)}`;
		});
	}

	/**
	 * Adds an emoji to the emojiList object's 'type' property. Creates a new property of 'type_1' if the first goese over a length of 1024 characters. This patern
	 * continues for 'type_n'.
	 * @param emojiList object containing typed emoji properties
	 * @param type property name to add emoji to
	 * @param emoji emoji to add to list
	 */
	private addEmojiToList(emojiList: any, type: string, emoji: GuildEmoji): any {
		let pos = 1;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const name = pos === 1 ? type : `${type} ${pos}`;
			if (emojiList[name] === undefined) {
				emojiList[name] = `${emoji}`;
				break;
			} else if (emojiList[name].length + ` ${emoji}`.length < ClientTools._MAX_FIELD_LENGTH) {
				emojiList[name] += ` ${emoji}`;
				break;
			} else {
				++pos;
			}
		}
	}

	/**
	 * Returns a list of usable emojis for the given Guild. If no Guild id is provided, only returns the default bot emojis.
	 * @param guildId id for the Guild to search emojis in
	 */
	public createClientEmojisList(guildId?: string): any {
		const emojiList = {};
		this._Client.emojis.cache
			.filter(({ guild }) => this._BotGuilds.has(guild.id) || guild.id === guildId)
			.forEach((emoji: GuildEmoji) => {
				if (emoji.guild.id === guildId) {
					this.addEmojiToList(emojiList, 'Guild', emoji);
				}
				if (this._BotGuilds.has(emoji.guild.id)) {
					for (const type of ClientTools._EmojiTypes) {
						const typeRegex = new RegExp(`(${type})$`, 'i');
						if (typeRegex.test(emoji.name)) {
							this.addEmojiToList(emojiList, type, emoji);
						}
					}
				}
			});
		return emojiList;
	}
}

export type EmbedField = {
	name: string;
	value: any;
	options?: FieldOptions;
};

type FieldOptions = {
	inline?: boolean;
	default?: string;
	separator?: string;
	continueWhenOver?: boolean;
};
