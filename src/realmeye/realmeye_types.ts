export type UserData = {
    name?: string,
    realmEyeUrl?: string,
    description?: string,
    characters?: Character[],
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
    lastSeen?: string
}

export type Character = {
    pet?: string,
    model?: CharacterModelInfo,
    class?: string,
    level?: number,
    fame?: number,
    exp?: number,
    place?: number,
    equipment?: EquipmentSet,
    maxedStats?: string,
    stats?: CharacterStats
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
    HP, MP, ATT, DEF, SPD, VIT, WIS, DEX
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

export type CharacterTableIndexes = {
    [P in keyof Character]?: number;
}