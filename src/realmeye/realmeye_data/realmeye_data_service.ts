/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import * as cheerio from 'cheerio';
import { injectable } from 'inversify';
import Logger from '../../utils/logging';
import { Status } from '../../utils/status';
import { StringUtils } from '../../utils/string_utils';
import {
	Character,
	CharacterModelInfo,
	ClassDefinition,
	ClassData,
	ClassStats,
	DungeonCompletions,
	EquipmentSet,
	RealmEyeGuildData,
	Item,
	RealmEyePlayerData,
	SkinList,
	StatType,
	TableIndexes,
	EquipmentSlot,
} from './realmeye_data_types';
import { RealmEyeError } from '../realmeye_error';
import { InitializationSettings, RealmeyeService } from '../realmeye_service';

/**
 * Cheerio NOTE: Any method having a parameter type of 'any' is due to Cheerio not exposing
 * its internal types/interfaces. This means that the types are essentially useless right now.
 * I've tried looking for simple solutions, but it seems like nothing exists right now that would
 * be a reasonably quick fix. In the future, I'd like to use the correct typings and do safer
 * checks for element existence and data scraping. For now, this is how it is.
 *
 * NOTE of NOTE: Cheerio has been updated and now has proper types. The package needs to be updated and this class needs to be updated.
 * NOTE of NOTE of NOTE: Cheerio types are absolute trash, so it will continue being done unsafely for now. Cheerio types still mostly aren't exposed
 * and there's no way to check the instanceof a subelement of any single element. Beware future headache. (maybe replace cheerio)
 */
@injectable()
export class RealmeyeDataService extends RealmeyeService {
	static readonly _DUNGEON_LIST_SUB_URL = '/wiki/dungeons';
	static readonly _CLASS_INFO_SUB_URL = '/s/er/js/classinfo.js';

	private static readonly _DUNGEON_LIST: Set<string> = new Set();
	private static readonly _CLASS_DATA: ClassData = {};

	static get dungeonList(): Set<string> {
		return RealmeyeDataService._DUNGEON_LIST;
	}

	static get classData(): ClassData {
		return RealmeyeDataService._CLASS_DATA;
	}

	static async initialize(initializationSettings: Partial<InitializationSettings>): Promise<Status<unknown>> {
		const status = Status.createPending();
		const promises = [];
		promises.push(
			RealmeyeDataService.attemptInitialization(
				RealmeyeDataService.buildDungeonList,
				initializationSettings
			).then((s) => {
				status.merge(s);
			})
		);
		promises.push(
			RealmeyeDataService.attemptInitialization(RealmeyeDataService.buildClassList, initializationSettings).then(
				(s) => {
					status.merge(s);
				}
			)
		);

		return Promise.all(promises).then(() => {
			return status.finalize();
		});
	}

	static async getRealmEyePlayerData(ign: string): Promise<RealmEyePlayerData> {
		const baseUrl = `${RealmeyeDataService._BASE_REALMEYE_URL}/player`;
		const url = `${baseUrl}/${ign}`;
		const data = (await RealmeyeDataService.getRealmEyePage(url)).data;

		const $ = cheerio.load(data);
		const container = $('.container');
		const playerNotFound = $('.player-not-found', container);
		if (playerNotFound.length) {
			throw new RealmEyeError(
				`${ign}'s RealmEye profile could not be found. The profile is either private or does not exist.`,
				{ url: url }
			);
		}

		const name = $('div h1 .entity-name', container).text();

		const userData: RealmEyePlayerData = {
			name: name,
			realmEyeUrl: `${baseUrl}/${name}`,
		};

		const promises = [];
		try {
			promises.push(RealmeyeDataService.addDungeonCompletions(ign, userData));
		} catch (error) {
			Logger.warn('Error fetching user dungeon completions', { error: error });
		}

		userData.description = RealmeyeDataService.buildDescription($, container);
		RealmeyeDataService.addUserTableInfo($, container, userData);
		userData.characters = RealmeyeDataService.buildCharacterData($, container, 'player');

		return Promise.all(promises).then(() => {
			return userData;
		});
	}

	static async getRealmEyeGuildData(guildName: string): Promise<RealmEyeGuildData> {
		const guildLinkName = guildName.replace(/\s/g, '%20');
		const url = `${RealmeyeDataService._BASE_REALMEYE_URL}/guild/${guildLinkName}`;
		const data = (await RealmeyeDataService.getRealmEyePage(url)).data;

		const $ = cheerio.load(data);
		const container = $('.container');
		const guildNotFound = $('.col-md-12 > h2', container).first();
		if (guildNotFound?.text()?.match(/^sorry.*/i)) {
			throw new RealmEyeError(
				`${guildName} does not exist on RealmEyeDataService. Guild names are case sensitive, so be sure you're using the correct capitalization.`,
				{ url: url }
			);
		}

		const guildData: RealmEyeGuildData = {
			name: guildName,
			realmEyeUrl: url,
		};

		const promises = [];
		try {
			promises.push(RealmeyeDataService.addTopGuildCharacters(guildLinkName, guildData));
		} catch (error) {
			Logger.warn('Error fetching top guild characters', { error: error });
		}

		guildData.description = RealmeyeDataService.buildDescription($, container);
		RealmeyeDataService.addGuildTableInfo($, container, guildData);
		RealmeyeDataService.addGuildMemberData($, container, guildData);

		return Promise.all(promises).then(() => {
			return guildData;
		});
	}

	private static async buildDungeonList(): Promise<Status<unknown>> {
		const status = Status.createPending();
		const url = `${RealmeyeDataService._BASE_REALMEYE_URL}${RealmeyeDataService._DUNGEON_LIST_SUB_URL}`;
		const data = (await RealmeyeDataService.getRealmEyePage(url)).data;

		const headingSelector = 'h2#realm-dungeons, h2#realm-event-dungeons, h2#oryx-s-castle, h2#mini-dungeons';
		const $ = cheerio.load(data) as any;
		const container = $('.container');
		const headAndTable = $(headingSelector + ', div.table-responsive', container);
		for (let i = 0; i < headAndTable.length; i++) {
			if (headAndTable.get(i)?.name !== 'h2' || headAndTable.get(i + 1)?.name !== 'div') {
				continue;
			}

			$('.table.table-striped > tbody > tr', headAndTable.get(i + 1)).each((j, dungeonRow) => {
				const nameCell = $('td', dungeonRow).get(0);
				const nameData = $('a', nameCell).first();
				RealmeyeDataService._DUNGEON_LIST.add(nameData.text());
			});
		}
		Object.freeze(RealmeyeDataService._DUNGEON_LIST);
		return status.finalize();
	}

	private static async buildClassList(): Promise<Status<unknown>> {
		const status = Status.createPending();

		const url = `${RealmeyeDataService._BASE_REALMEYE_URL}${RealmeyeDataService._CLASS_INFO_SUB_URL}`;

		const data: string = (await RealmeyeDataService.getRealmEyePage(url)).data.replace(/^[^=]*=\[(.*)\];$/, '$1');

		let offset = 0;
		while (offset < data.length) {
			/**
			 * The following regex builds a RegexExpExecArray where each position stores the following:
			 * 0: full match
			 * 1: id
			 * 2: name
			 * 3: plural name
			 * 4: stats
			 * 5: junk
			 * 6: junk
			 * 7: skins
			 * 8: junk
			 * 9: num
			 */
			const regex =
				/\[([\de]+),\"(\w+)\",\"(\w+)\",(((\[[\d\.,]+\]),){3})(\[(\[[\de]+,\"[^"]+\",\d+\],?)*\]),(\d+)\],?/g;

			const matchedClass = regex.exec(data.substr(offset));
			if (!matchedClass) {
				/**
				 * This is due to some parsing error i.e. probably the last attempt at parsing
				 * a class where the offset does not perfectly match the entire length of the data
				 */
				throw new Error(
					'Error while parsing class info data. Encountered null regex match likely caused by an unexpected mismatch during parsing. Look to update regex if this persists.'
				);
			}
			const clazz: ClassDefinition = {
				id: matchedClass[1],
				name: matchedClass[2],
				pluralName: matchedClass[3],
				num: parseInt(matchedClass[9]),
			};

			/**
			 * More weird stuff has to be done here to 'easily' parse the stats.
			 * The full stats match is in the format of [startHP, startMP, startATT, ...], [avgHP/lvl, avgMP/lvl, avgATT/lvl, ...], [maxHP, maxMP, maxATT, ...],
			 * First, JSON.parse does not parse decimals, so they must be converted to strings, then the end comma needs to be removed, then everything
			 * needs to be encased by a set of square brackets because JSON.parse will not parse it as 3 arrays--only as 1 array with nested arrays
			 * After that, some strange-looking steps are used to make the code more compact and as unreliant on hard-code as easily possible
			 */
			const stats: [string[]] = JSON.parse(
				'[' + matchedClass[4].replace(/([\d\.]+)/g, '"$1"').replace(/,$/, '') + ']'
			);
			const statGroupNames = ['startingStats', 'avgStatPerLevel', 'maxStats'];
			for (let i = 0; i < stats.length; i++) {
				const classStats: ClassStats = {};
				const statGroup = stats[i];
				let statNum = 0;
				for (const stat of Object.values(StatType)) {
					classStats[stat] = parseFloat(statGroup[statNum++]);
				}
				clazz[statGroupNames[i]] = classStats;
			}

			/**
			 * The skins match is in the format of [[skinId,skinName,num],[skinId,skinName,num]]
			 * The replacement must be done because, currently, there is one skin for Warrior (Warrior - Dungeon Mastermind)
			 * with a skinId of 6e3. The replacement converts all skinId's to strings because, otherwise, the JSON.parse
			 * will convert all skinId's to numbers and then it converts 6e3 to 6000, so it loses its original value
			 */
			const skins = JSON.parse(matchedClass[7].replace(/\[([\de]+)/g, '["$1"'));
			const skinList: SkinList = {};
			for (const skin of skins) {
				skinList[skin[1]] = {
					id: skin[0],
					name: skin[1],
					num: skin[2],
				};
			}
			clazz.skins = skinList;

			RealmeyeDataService._CLASS_DATA[clazz.name] = clazz;
			offset += matchedClass[0].length;
		}

		Object.freeze(RealmeyeDataService._CLASS_DATA);
		return status.finalize();
	}

	private static buildDescription($: any, container: any): string {
		const userDescription = $('.description', container).first();
		let description = '';
		$('.description-line', userDescription).each((i, line) => {
			const text = line.children[0]?.data || '';
			description += !description ? text : `\n${text}`;
		});
		return description;
	}

	private static addUserTableInfo($: any, container: any, userData: RealmEyePlayerData): void {
		const summaryTable = $('div table.summary', container);
		$('tr', summaryTable).each((i, e) => {
			const td = $('td', e);
			const rowTitle = td.first().text();
			const data = td.get(1);
			let num;
			switch (rowTitle.toUpperCase()) {
				case 'CHARACTERS':
					num = data.children[0]?.data;
					userData.characterCount = num ? parseInt(num) : num;
					break;
				case 'SKINS':
					num = $('span', data).first().text();
					userData.skins = num ? parseInt(num) : num;
					break;
				case 'EXALTATIONS':
					num = $('span', data).first().text();
					userData.exaltations = num ? parseInt(num) : num;
					break;
				case 'FAME':
					num = $('span', data).first().text();
					userData.fame = num ? parseInt(num) : num;
					break;
				case 'EXP':
					num = $('span', data).first().text();
					userData.exp = num ? parseInt(num) : num;
					break;
				case 'RANK':
					const starContainer = $('.star-container', data).first();
					num = starContainer.text();
					userData.rank = num ? parseInt(num) : num;
					const star: string = $('.star', starContainer)
						.first()
						.attr()
						?.class?.match(/(star-.*)/)[1];
					userData.star = star?.substr(star?.indexOf('-') + 1);
					break;
				case 'ACCOUNT FAME':
					num = $('span', data).first().text();
					userData.accountFame = num ? parseInt(num) : num;
					break;
				case 'GUILD':
					const guild = $('a', data).first();
					if (guild.length) {
						userData.guild = guild.text();
						userData.realmEyeGuildUrl = `${RealmeyeDataService._BASE_REALMEYE_URL}${guild.attr().href}`;
					}
					break;
				case 'GUILD RANK':
					userData.guildRank = data.children[0].data;
					break;
				case 'CREATED':
					userData.created = data.children[0].data;
					break;
				case 'LAST SEEN':
					let lastSeen = data.children[0].data;
					if (!lastSeen) {
						lastSeen = data.children[0]?.children[0]?.data + data.children[1]?.data;
					}
					userData.lastSeen = lastSeen;
					break;
			}
		});
	}

	private static buildCharacterData($: any, container: any, type: 'player' | 'guild'): Character[] {
		if ($('.col-md-12 > h3', container)[0]?.children[0]?.data?.match(/characters are hidden/i)) {
			return;
		}
		const charactersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
		if (!charactersTable.length) {
			return;
		}

		const characterTableIndexes = RealmeyeDataService.buildCharacterTableIndexes($, charactersTable, type);
		const characters: Character[] = [];
		$('tbody > tr', charactersTable).each((i, charRow) => {
			characters.push(RealmeyeDataService.buildCharacter($, charRow, characterTableIndexes));
		});
		return characters;
	}

	private static buildCharacter($: any, charRow: any, indexes: TableIndexes<Character>): Character {
		const character: Character = {
			private: false,
			guildCharacter: false,
			class: 'Wizard',
			fame: 0,
			maxedStats: '?/8',
		};
		$('td', charRow).each((j, charData) => {
			switch (j) {
				case indexes.pet:
					character.pet = charData.children[0]?.attribs?.['data-item'];
					break;
				case indexes.owner:
					character.guildCharacter = true;
					if (charData.children[0]?.data?.match(/private/i)) {
						character.private = true;
					}
					const nameData = $('a', charData).first();
					const name = nameData.text();
					const ownerUrl = `${RealmeyeDataService._BASE_REALMEYE_URL}${nameData.attr()?.href}`;
					character.owner = {
						name: name,
						realmEyeUrl: ownerUrl,
					};
					break;
				case indexes.model:
					const modelAttr = $('.character', charData).first().attr();
					character.model = RealmeyeDataService.buildCharacterModelInfo(modelAttr);
					break;
				case indexes.class:
					character.class = charData.children[0]?.data;
					break;
				case indexes.level:
					const level = charData.children[0]?.data;
					character.level = level ? parseInt(level) : 0;
					break;
				case indexes.fame:
					const fame = charData.children[0]?.data;
					character.fame = fame ? parseInt(fame) : 0;
					break;
				case indexes.exp:
					const exp = charData.children[0]?.data;
					character.exp = exp ? parseInt(exp) : 0;
					break;
				case indexes.place:
					const place = $('a', charData).first().text();
					character.place = place ? parseInt(place) : 0;
					break;
				case indexes.equipment:
					character.equipment = RealmeyeDataService.buildCharacterEquipmentSet($, charData);
					break;
				case indexes.stats:
					// TODO: use stats below to check specific maxed stats once RealmEye has the information available again
					// const stats = $('.player-stats', charData).first().attr();
					character.maxedStats = charData.children[0]?.children[0]?.data;
					break;
				case indexes.lastSeen:
					let lastSeen = charData.children[0]?.data;
					if (!lastSeen) {
						lastSeen = $('span', charData).first().text();
					}
					character.lastSeen = lastSeen;
					break;
				case indexes.server:
					character.server = $('abbr', charData).first().attr()?.title;
					break;
			}
		});
		if (character.private) {
			return {
				guildCharacter: true,
				fame: 0,
				maxedStats: '?/8',
				private: true,
				owner: {
					name: 'Private',
				},
				class: character.class,
			};
		}
		return character;
	}

	private static buildCharacterTableIndexes(
		$: any,
		charactersTable: any,
		type: 'player' | 'guild'
	): TableIndexes<Character> {
		const indexes: TableIndexes<Character> = {};
		$('thead th', charactersTable).each((i, e) => {
			let heading: string = e.children[0]?.data;
			heading = heading ? heading : e.children[0]?.children[0]?.data;
			if (!heading) {
				return;
			}
			switch (heading.toUpperCase()) {
				case 'NAME':
					if (type === 'guild') {
						indexes.model = i - 1;
					}
					indexes.owner = i;
					break;
				case 'CLASS':
					if (type === 'player') {
						indexes.pet = i - 2;
						indexes.model = i - 1;
					}
					indexes.class = i;
					break;
				case 'L':
					indexes.level = i;
					break;
				case 'FAME':
					indexes.fame = i;
					break;
				case 'EXP':
					indexes.exp = i;
					break;
				case 'PL.':
					indexes.place = i;
					break;
				case 'EQUIPMENT':
					indexes.equipment = i;
					break;
				case 'STATS':
					indexes.stats = i;
					break;
				case 'LAST SEEN':
					indexes.lastSeen = i;
					break;
				case 'SRV.':
					indexes.server = i;
					break;
			}
		});
		return indexes;
	}

	private static buildCharacterModelInfo(modelData: any): CharacterModelInfo {
		if (!modelData) {
			return undefined;
		}
		const modelInfo: CharacterModelInfo = {};
		modelInfo.charactersWithOutfitUrl = `${RealmeyeDataService._BASE_REALMEYE_URL}${modelData.href}`;
		modelInfo.renderPosition = modelData.style?.split(':')[1]?.trim();
		modelInfo['data-class'] = modelData['data-class'];
		modelInfo['data-skin'] = modelData['data-skin'];
		modelInfo['data-dye1'] = modelData['data-dye1'];
		modelInfo['data-dye2'] = modelData['data-dye2'];
		modelInfo['data-accessory-dye-id'] = modelData['data-accessory-dye-id'];
		modelInfo['data-clothing-dye-id'] = modelData['data-clothing-dye-id'];
		modelInfo['data-count'] = modelData['data-count'];
		return modelInfo;
	}

	private static buildCharacterEquipmentSet($: any, charData: any): EquipmentSet {
		const equipmentSet: EquipmentSet = {};
		const items = $('span.item-wrapper', charData);
		items.each((i, itemData) => {
			const item: Item = {};
			const itemInfo = $('.item', itemData).first().attr();
			const itemName = itemInfo?.title ?? 'Empty Slot';
			item.name = itemName.replace(/ (UT|T[\d]+)$/g, '');
			if (!item.name?.match(/empty slot/i)) {
				const link = $('a', itemData).first().attr().href;
				item.realmEyeUrl = `${RealmeyeDataService._BASE_REALMEYE_URL}${link}`;
				item.renderPosition = itemInfo?.style?.split(':')[1]?.trim();
			}

			switch (i) {
				case 0:
					item.slot = EquipmentSlot.WEAPON;
					equipmentSet.weapon = item;
					break;
				case 1:
					item.slot = EquipmentSlot.ABILITY;
					equipmentSet.ability = item;
					break;
				case 2:
					item.slot = EquipmentSlot.ARMOR;
					equipmentSet.armor = item;
					break;
				case 3:
					item.slot = EquipmentSlot.RING;
					equipmentSet.ring = item;
					break;
				case 4:
					item.slot = EquipmentSlot.BACKPACK;
					equipmentSet.backpack = item;
					break;
			}
		});
		return equipmentSet;
	}

	private static async addDungeonCompletions(ign: string, userData: RealmEyePlayerData): Promise<void> {
		const url = `${RealmeyeDataService._BASE_REALMEYE_URL}/graveyard-summary-of-player/${ign}`;
		const data = (await RealmeyeDataService.getRealmEyePage(url)).data;

		const completions: DungeonCompletions = {};

		const $ = cheerio.load(data) as any;
		const completionsTable = $('table.main-achievements');
		$('tbody > tr', completionsTable).each((i, tableRow) => {
			const rowData = $('td', tableRow);
			const rowLabel: string = rowData.get(1)?.children[0]?.data;
			let dungeon;
			if (rowLabel?.match(/.*completed$/i) && !rowLabel?.match(/^quests.*/i)) {
				const name = rowLabel.replace(' completed', '');
				dungeon = StringUtils.findBestMatch(name, Array.from(RealmeyeDataService._DUNGEON_LIST));
			}
			if (dungeon) {
				const total = rowData.get(2)?.children[0]?.data;
				const num = total ? parseInt(total) : 0;
				completions[dungeon] = num;
			}
		});
		userData.dungeonCompletions = completions;
	}

	private static async addTopGuildCharacters(guildLinkName: string, guildData: RealmEyeGuildData): Promise<void> {
		const url = `${RealmeyeDataService._BASE_REALMEYE_URL}/top-characters-of-guild/${guildLinkName}`;
		const data = (await RealmeyeDataService.getRealmEyePage(url)).data;

		const $ = cheerio.load(data);
		const container = $('.container');
		guildData.topCharacters = RealmeyeDataService.buildCharacterData($, container, 'guild');
	}

	private static addGuildTableInfo($: any, container: any, guildData: RealmEyeGuildData): void {
		const summaryTable = $('div table.summary', container);
		$('tr', summaryTable).each((i, e) => {
			const td = $('td', e);
			const rowTitle = td.first().text();
			const data = td.get(1);
			let num;
			switch (rowTitle.toUpperCase()) {
				case 'MEMBERS':
					num = data.children[0]?.data;
					guildData.memberCount = num ? parseInt(num) : num;
					break;
				case 'CHARACTERS':
					num = data.children[0]?.data;
					guildData.characterCount = num ? parseInt(num) : num;
					break;
				case 'FAME':
					const fame = $('span', data).first()?.text();
					guildData.fame = fame ? parseInt(fame) : fame;
					num = $('a', data).first()?.text();
					guildData.fameRank = num ? parseInt(num) : num;
					break;
				case 'EXP':
					const exp = $('span', data).first()?.text();
					guildData.exp = exp ? parseInt(exp) : exp;
					num = $('a', data).first()?.text();
					guildData.expRank = num ? parseInt(num) : num;
					break;
				case 'MOST ACTIVE ON':
					guildData.server = $('a', data).first().text();
					num = data.children[1]?.data?.replace(' (', '');
					guildData.serverRank = num ? parseInt(num) : num;
					break;
			}
		});
	}

	private static addGuildMemberData($: any, container: any, guildData: RealmEyeGuildData): void {
		const membersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
		if (!membersTable.length) {
			return;
		}

		const memberTableIndexes = RealmeyeDataService.buildMemberTableIndexes($, membersTable);
		const members: RealmEyePlayerData[] = [];
		$('tbody > tr', membersTable).each((i, memberRow) => {
			members.push(RealmeyeDataService.buildMember($, memberRow, memberTableIndexes));
		});
		guildData.members = members;
	}

	private static buildMember($: any, memberRow: any, indexes: TableIndexes<RealmEyePlayerData>): RealmEyePlayerData {
		const member: RealmEyePlayerData = {};
		$('td', memberRow).each((j, memberData) => {
			let num;
			switch (j) {
				case indexes.name:
					const starContainer = $('.star-container', memberData).first();
					if (starContainer.length) {
						const star: string = $('.star', starContainer)
							.first()
							.attr()
							?.class?.match(/(star-.*)/)[1];
						member.star = star?.substr(star?.indexOf('-') + 1);

						const name = $('a', starContainer).first();
						member.name = name.text();
						member.realmEyeUrl = `${RealmeyeDataService._BASE_REALMEYE_URL}${name.attr()?.href}`;
					} else {
						member.name = memberData.children[0]?.data;
					}
					break;
				case indexes.guildRank:
					member.guildRank = memberData.children[0]?.data;
					break;
				case indexes.fame:
					num = $('a', memberData).first().text();
					member.fame = num ? parseInt(num) : 0;
					break;
				case indexes.exp:
					num = memberData.children[0]?.data;
					member.exp = num ? parseInt(num) : 0;
					break;
				case indexes.rank:
					num = memberData.children[0]?.data;
					member.rank = num ? parseInt(num) : 0;
					break;
				case indexes.characterCount:
					num = memberData.children[0]?.data;
					member.characterCount = num ? parseInt(num) : 0;
					break;
				case indexes.lastSeen:
					let lastSeen = memberData.children[0]?.data;
					if (!lastSeen) {
						lastSeen = $('span', memberData).first().text();
					}
					member.lastSeen = lastSeen;
					break;
				case indexes.server:
					member.server = $('abbr', memberData).first().attr()?.title;
					break;
				case indexes.avgFameChar:
					num = memberData.children[0]?.data;
					if (num === 'N/A') {
						member.avgFameChar = 0;
					} else {
						member.avgFameChar = num ? parseInt(num) : 0;
					}
					break;
				case indexes.avgExpChar:
					num = memberData.children[0]?.data;
					member.avgExpChar = num ? (num === 'N/A' ? 0 : parseInt(num)) : num;
					break;
			}
		});
		return member;
	}

	private static buildMemberTableIndexes($: any, membersTable: any): TableIndexes<RealmEyePlayerData> {
		const indexes: TableIndexes<RealmEyePlayerData> = {};
		$('thead th', membersTable).each((i, e) => {
			let heading: string = e.children[0]?.data;
			heading = heading || e.children[0]?.children[0]?.data;
			if (!heading) {
				return;
			}
			switch (heading.toUpperCase()) {
				case 'NAME':
					indexes.name = i;
					break;
				case 'GUILD RANK':
					indexes.guildRank = i;
					break;
				case 'FAME':
					indexes.fame = i;
					break;
				case 'EXP':
					indexes.exp = i;
					break;
				case 'RANK':
					indexes.rank = i;
					break;
				case 'C':
					indexes.characterCount = i;
					break;
				case 'LAST SEEN':
					indexes.lastSeen = i;
					break;
				case 'SRV.':
					indexes.server = i;
					break;
				case 'AF/C':
					indexes.avgFameChar = i;
					break;
				case 'AE/C':
					indexes.avgExpChar = i;
					break;
			}
		});
		return indexes;
	}
}
