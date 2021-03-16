export type UserData = {
    name?: string,
    realmEyeUrl?: string,
    description?: string,
    characters?: Character[],
    characterCount?: number,
    skins?: number,
    exaltations?: number,
    fame?: number,
    exp?: number,
    rank?: number,
    star?: string,
    accountFame?: number,
    guild?: string,
    realmEyeGuildUrl?: string,
    guildRank?: string,
    created?: Date,
    lastSeen?: string,
    server?: string,
    avgFameChar?: number,
    avgExpChar?: number,
    dungeonCompletions?: DungeonCompletions[]
}

export type GuildData = {
    name?: string,
    realmEyeUrl?: string,
    description?: string,
    members?: UserData[],
    memberCount?: number,
    characterCount?: number,
    fame?: number,
    fameRank?: number,
    exp?: number,
    expRank?: number,
    server?: string,
    serverRank?: number,
    topCharacters?: Character[]
}

export type Character = {
    private?: boolean,
    owner?: UserData,
    pet?: string,
    model?: CharacterModelInfo,
    class?: string,
    level?: number,
    fame?: number,
    exp?: number,
    place?: number,
    equipment?: EquipmentSet,
    maxedStats?: string,
    stats?: CharacterStats,
    lastSeen?: string,
    server?: string
}

export type CharacterModelInfo = {
    charactersWithOutfitUrl?: string,
    renderPosition?: string,
    'data-class'?: number,
    'data-skin'?: number,
    'data-dye1'?: number,
    'data-dye2'?: number,
    'data-accessory-dye-id'?: number,
    'data-clothing-dye-id'?: number,
    'data-count'?: number
}

export type CharacterStats = {
    [P in StatType]?: CharacterStat;
}

export type CharacterStat = {
    stat: StatType,
    maxed: boolean
}

export enum StatType {
    HP = 'HP',
    MP = 'MP',
    ATT = 'ATT',
    DEF = 'DEF',
    SPD = 'SPD',
    DEX = 'DEX',
    VIT = 'VIT',
    WIS = 'WIS'
}

export type EquipmentSet = {
    weapon?: Item,
    ability?: Item,
    armor?: Item,
    ring?: Item,
    backpack?: Item
}

export type Item = {
    name?: string,
    realmEyeUrl?: string,
    renderPosition?: string
}

export type TableIndexes<T> = {
    [P in keyof T]?: number;
}

export type DungeonCompletions = {
    name: string,
    completions: number
}

export type ClassList = {
    [key: string]: ClassInfo
}

export type ClassInfo = {
    name: string,
    realmEyeUrl?: string,
    imageUrl?: string,
    maxStats?: ClassStats
}

export type ClassStats = {
    [P in StatType as `max${P}`]?: number;
}