export enum RenderGroup {
	ITEMS = 'ITEMS',
	CLASS_SKINS = 'CLASS_SKINS',
	STARS = 'STARS',
	FAME = 'FAME',
}

export type RenderDefinitionMap = {
	[key: string]: RenderDefinition;
};

export type RenderDefinition = {
	name: string;
	ref: string;
	type: RenderType;
	startX?: number;
	startY?: number;
	width?: number;
	height?: number;
};

export enum RenderType {
	FULL_RENDER = -5,
	FAME = -4,
	STAR = -3,
	SKIN = -2,
	PET = -1,
	EMPTY = 0,
	SWORD = 1,
	DAGGER = 2,
	BOW = 3,
	TOME = 4,
	SHIELD = 5,
	LIGHT_ARMOR = 6,
	HEAVY_ARMOR = 7,
	WAND = 8,
	RING = 9,
	CONSUMABLE = 10,
	SPELL = 11,
	SEAL = 12,
	CLOAK = 13,
	ROBE = 14,
	QUIVER = 15,
	HELM = 16,
	STAFF = 17,
	POISON = 18,
	SKULL = 19,
	TRAP = 20,
	ORB = 21,
	PRISM = 22,
	SCEPTER = 23,
	KATANA = 24,
	NINJA_STAR = 25,
	EGG = 26,
	WAKIZASHI = 27,
	LUTE = 28,
	MACE = 29,
	OTHER,
}
