export type RealmEyePlayerData = {
	name?: string;
	realmEyeUrl?: string;
	description?: string;
	characters?: Character[];
	characterCount?: number;
	skins?: number;
	exaltations?: number;
	fame?: number;
	exp?: number;
	rank?: number;
	star?: string;
	accountFame?: number;
	guild?: string;
	realmEyeGuildUrl?: string;
	guildRank?: string;
	created?: Date;
	lastSeen?: string;
	server?: string;
	avgFameChar?: number;
	avgExpChar?: number;
	dungeonCompletions?: DungeonCompletions;
};

export type RealmEyeGuildData = {
	name?: string;
	realmEyeUrl?: string;
	description?: string;
	members?: RealmEyePlayerData[];
	memberCount?: number;
	characterCount?: number;
	fame?: number;
	fameRank?: number;
	exp?: number;
	expRank?: number;
	server?: string;
	serverRank?: number;
	topCharacters?: Character[];
};

export type Character = {
	private: boolean;
	guildCharacter: boolean;
	class: string;
	fame: number;
	maxedStats: string;
	owner?: RealmEyePlayerData;
	pet?: string;
	model?: CharacterModelInfo;
	level?: number;
	exp?: number;
	place?: number;
	equipment?: EquipmentSet;
	stats?: CharacterStats;
	lastSeen?: string;
	server?: string;
};

export type CharacterModelInfo = {
	charactersWithOutfitUrl?: string;
	renderPosition?: string;
	'data-class'?: string;
	'data-skin'?: string;
	'data-dye1'?: string;
	'data-dye2'?: string;
	'data-accessory-dye-id'?: string;
	'data-clothing-dye-id'?: string;
	'data-count'?: number;
};

export type CharacterStats = {
	[P in StatType]?: CharacterStat;
};

export type CharacterStat = {
	stat: StatType;
	maxed: boolean;
};

export enum StatType {
	HP = 'HP',
	MP = 'MP',
	ATT = 'ATT',
	DEF = 'DEF',
	SPD = 'SPD',
	DEX = 'DEX',
	VIT = 'VIT',
	WIS = 'WIS',
}

export type EquipmentSet = {
	[P in EquipmentSlot]?: Item;
};

export enum EquipmentSlot {
	WEAPON = 'weapon',
	ABILITY = 'ability',
	ARMOR = 'armor',
	RING = 'ring',
	BACKPACK = 'backpack',
}

export type Item = {
	name?: string;
	slot?: EquipmentSlot;
	realmEyeUrl?: string;
	renderPosition?: string;
};

export type TableIndexes<T> = {
	[P in keyof T]?: number;
};

export type DungeonCompletions = {
	[key: string]: number;
};

export type ClassData = {
	[key: string]: ClassDefinition;
};

export type ClassDefinition = {
	id: string;
	name: string;
	pluralName?: string;
	startingStats?: ClassStats;
	avgStatPerLevel?: ClassStats;
	maxStats?: ClassStats;
	skins?: SkinList;
	num?: number;
};

export type SkinList = {
	[key: string]: Skin;
};

export type Skin = {
	id: string;
	name: string;
	num: number;
};

export type ClassStats = {
	[P in StatType]?: number;
};
