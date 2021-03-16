import { injectable } from 'inversify';
import * as cheerio from 'cheerio';
import { RateLimitRequestService } from '../utilities/rate_limit_request_service';
import { RealmEyeError } from './realmeye_exception';
import { Character, CharacterModelInfo, ClassList, DungeonCompletions, EquipmentSet, GuildData, Item, StatType, TableIndexes, UserData } from './realmeye_types';
import { findBestMatch } from '../utilities/string_matcher';

/**
 * Cheerio NOTE: Any method having a parameter type of 'any' is due to Cheerio not exposing
 * its internal types/interfaces. This means that the types are essentially useless right now.
 * I've tried looking for simple solutions, but it seems like nothing exists right now that would
 * be a reasonably quick fix. In the future, I'd like to use the correct typings and do safer
 * checks for element existence and data scraping. For now, this is how it is.
 */

export class RealmEyeService {

    private static readonly _BASE_REALMEYE_URL = 'https://www.realmeye.com';
    private static readonly _DUNGEON_LIST: Set<string> = new Set();
    private static _CLASS_LIST: ClassList;

    private readonly _RequestService: RateLimitRequestService;

    public constructor() {
        this._RequestService = new RateLimitRequestService(1, {headers: {'User-Agent': 'IrisBot RotMG Discord Bot'}});
        if (!RealmEyeService._DUNGEON_LIST?.size) {
            this.buildDungeonList();
        }
        if (!RealmEyeService._CLASS_LIST) {
            this.buildClassList();
        }
    }

    public static get dungeonList(): Set<string> {
        return RealmEyeService._DUNGEON_LIST;
    }

    public static get classList(): ClassList {
        return RealmEyeService._CLASS_LIST;
    }

    private async buildDungeonList(): Promise<void> {
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/wiki/dungeons`;
        const { data, status, statusText } = await this._RequestService.get(url);
        if (status !== 200){
            throw new RealmEyeError('Error accessing RealmEye while initializing dungeon list.', {url: url, status: status, statusText: statusText});
        }

        const headingSelector = 'h2#realm-dungeons, h2#realm-event-dungeons, h2#oryx-s-castle, h2#mini-dungeons';
        const $ = cheerio.load(data);
        const container = $('.container');
        const headAndTable = $(headingSelector + ', div.table-responsive', container);
        for (let i=0; i < headAndTable.length; i++) {
            if (headAndTable.get(i)?.name !== 'h2' || headAndTable.get(i+1)?.name !== 'div') {
                continue;
            }

            $('.table.table-striped > tbody > tr', headAndTable.get(i+1)).each((j, dungeonRow) => {
                const nameCell = $('td', dungeonRow).get(0);
                const nameData = $('a', nameCell).first();
                RealmEyeService.dungeonList.add(nameData.text());
            });
        }
    }

    private async buildClassList(): Promise<void> {
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/wiki/classes`;
        const { data, status, statusText } = await this._RequestService.get(url);
        if (status !== 200){
            throw new RealmEyeError('Error accessing RealmEye while initializing class list.', {url: url, status: status, statusText: statusText});
        }
        const $ = cheerio.load(data);
        const tables = $('div.wiki-page > div.table-responsive > table');
        const classList: ClassList = {};
        for (let i=0; i < tables.length; i++) {
            if (i < tables.length -1) {
                this.addClassUrlsFromTable($, tables.get(i), classList);
            } else {
                this.addClassStatsFromTable($, tables.get(i), classList);
            }
        }
        RealmEyeService._CLASS_LIST = classList;
    }

    private addClassUrlsFromTable($: any, table: any, classList: ClassList): void {
        $('td', table).each((i, classCell) => {
            const classData = $('a', classCell).first();
            const classLink = `${RealmEyeService._BASE_REALMEYE_URL}${classData.attr()?.href}`;
            const img = $('img', classData).first();
            const className = img.attr()?.alt?.toLowerCase();
            const imgSrc:string = img.attr()?.src;
            let imageLink;
            if (imgSrc?.startsWith('//')) {
                imageLink = imgSrc?.substr(2);
            } else {
                imageLink = `${RealmEyeService._BASE_REALMEYE_URL}${imgSrc}`;
            }
            classList[className] = {
                name: className,
                realmEyeUrl: classLink,
                imageUrl: imageLink
            }
        });
    }

    private addClassStatsFromTable($: any, table: any, classList: ClassList) {
        $('tbody > tr', table).each((i, classRow) => {
            const className = $('th a', classRow).first().text()?.toLowerCase();
            console.log(className);
            classList[className].maxStats = {};
            $('td > div', classRow).each((j, max) => {
                const maxValue = max.children[0]?.data;
                if (j < Object.values(StatType).length) {
                    const stat = Object.values(StatType)[j];
                    classList[className].maxStats[stat] = parseInt(maxValue);
                }
            });
        });
    }

    public async getRealmEyeUserData(ign: string): Promise<UserData> {
        const baseUrl = `${RealmEyeService._BASE_REALMEYE_URL}/player`;
        const url = `${baseUrl}/${ign}`;
        const { data, status, statusText } = await this._RequestService.get(url);
        if (status !== 200) {
            throw new RealmEyeError(`Encountered a ${status} error when attempting to access RealmEye.`, {url: url, status: status, statusText: statusText});
        }

        const $ = cheerio.load(data);
        const container = $('.container');
        const playerNotFound = $('.player-not-found', container);
        if (playerNotFound.length) {
            throw new RealmEyeError(`${ign}'s RealmEye profile could not be found. The profile is either private or does not exist.`, {url: url});
        }

        const name = $('div h1 .entity-name', container).text();

        const userData:UserData = {
            name: name,
            realmEyeUrl: `${baseUrl}/${name}`
        }

        const promises = [];
        promises.push(this.addDungeonCompletions(ign, userData));

        userData.description = this.buildDescription($, container);
        this.addUserTableInfo($, container, userData);
        userData.characters = this.buildCharacterData($, container, 'user');

        return Promise.all(promises).then(() => {
            return userData;
        });
    }

    private buildDescription($: any, container: any): string {
        const userDescription = $('.description', container).first();
        let description = '';
        $('.description-line', userDescription).each((i, line) => {
            const text = line.children[0]?.data || '';
            description += !description ? text : `\n${text}`;
        });
        return description;
    }

    private addUserTableInfo($: any, container: any, userData: UserData): void {
        const summaryTable = $('div table.summary', container);
        $('tr', summaryTable).each((i, e) => {
            const td = $('td', e);
            const rowTitle = td.first().text();
            const data = td.get(1);
            let num;
            switch (rowTitle.toLowerCase()) {
                case 'characters':
                    num = data.children[0]?.data;
                    userData.characterCount = num ? parseInt(num) : num;
                    break;
                case 'skins':
                    num = $('span', data).first().text();
                    userData.skins = num ? parseInt(num) : num;
                    break;
                case 'exaltations':
                    num = $('span', data).first().text();
                    userData.exaltations = num ? parseInt(num) : num;
                    break;
                case 'fame':
                    num = $('span', data).first().text();
                    userData.fame = num ? parseInt(num) : num;
                    break;
                case 'exp':
                    num = $('span', data).first().text();
                    userData.exp = num ? parseInt(num) : num;
                    break;
                case 'rank':
                    const starContainer = $('.star-container', data).first();
                    num = starContainer.text();
                    userData.rank = num ? parseInt(num) : num;
                    const star: string = $('.star', starContainer).first().attr()?.class?.match(/(star-.*)/)[1];
                    userData.star = star?.substr(star?.indexOf('-')+1);
                    break;
                case 'account fame':
                    num = $('span', data).first().text();
                    userData.accountFame = num ? parseInt(num) : num;
                    break;
                case 'guild':
                    const guild = $('a', data).first();
                    if (guild.length) {
                        userData.guild = guild.text();
                        userData.realmEyeGuildUrl = `${RealmEyeService._BASE_REALMEYE_URL}${guild.attr().href}`;
                    }
                    break;
                case 'guild rank':
                    userData.guildRank = data.children[0].data;
                    break;
                case 'created':
                    userData.created = data.children[0].data;
                    break;
                case 'last seen':
                    let lastSeen = data.children[0].data;
                    if (!lastSeen) {
                        lastSeen = data.children[0]?.children[0]?.data + data.children[1]?.data;
                    }
                    userData.lastSeen = lastSeen;
                    break;
            }
        });
    }

    private buildCharacterData($: any, container: any, type: 'user'|'guild'): Character[] {
        if ($('.col-md-12 > h3', container)[0]?.children[0]?.data?.match(/characters are hidden/i)) {
            return;
        }
        const charactersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
        if (!charactersTable.length) {
            return;
        }
        
        const characterTableIndexes = this.buildCharacterTableIndexes($, charactersTable, type);
        const characters: Character[] = [];
        $('tbody > tr', charactersTable).each((i, charRow) => {
            characters.push(this.buildCharacter($, charRow, characterTableIndexes));
        });
        return characters;
    }

    private buildCharacter($: any, charRow: any, indexes: TableIndexes<Character>): Character {
        const character: Character = {};
        $('td', charRow).each((j, charData) => {
            switch (j) {
                case indexes.owner:
                    if (charData.children[0]?.data?.match(/private/i)) {
                        character.private = true;
                    }
                    const nameData = $('a', charData).first();
                    const name = nameData.text();
                    const ownerUrl = `${RealmEyeService._BASE_REALMEYE_URL}${nameData.attr()?.href}`;
                    character.owner = {
                        name: name,
                        realmEyeUrl: ownerUrl
                    }
                    break;
                case indexes.model:
                    const modelAttr = $('.character', charData).first().attr();
                    character.model = this.buildCharacterModelInfo(modelAttr);
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
                    character.equipment = this.buildCharacterEquipmentSet($, charData);
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
                private: true,
                class: character.class
            }
        }
        return character;
    }

    private buildCharacterTableIndexes($: any, charactersTable: any, type: 'user'|'guild'): TableIndexes<Character> {
        const indexes: TableIndexes<Character> = {};
        $('thead th', charactersTable).each((i, e) => {
            let heading: string = e.children[0]?.data;
            heading = heading ? heading : e.children[0]?.children[0]?.data;
            if (!heading) {
                return;
            }
            switch (heading.toLowerCase()) {
                case 'name':
                    if (type === 'guild') {
                        indexes.model = i-1;
                    }
                    indexes.owner = i;
                case 'class':
                    if (type === 'user') {
                        indexes.pet = i-2;
                        indexes.model = i-1;
                    }
                    indexes.class = i;
                    break;
                case 'l':
                    indexes.level = i;
                    break;
                case 'fame':
                    indexes.fame = i;
                    break;
                case 'exp':
                    indexes.exp = i;
                    break;
                case 'pl.':
                    indexes.place = i;
                    break;
                case 'equipment':
                    indexes.equipment = i;
                    break;
                case 'stats':
                    indexes.stats = i;
                    break;
                case 'last seen':
                    indexes.lastSeen = i;
                    break;
                case 'srv.':
                    indexes.server = i;
                    break;
            }
        });
        return indexes;
    }

    private buildCharacterModelInfo(modelData: any): CharacterModelInfo {
        if (!modelData) {
            return undefined;
        }
        const modelInfo: CharacterModelInfo = {};
        modelInfo.charactersWithOutfitUrl = `${RealmEyeService._BASE_REALMEYE_URL}${modelData.href}`;
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

    private buildCharacterEquipmentSet($: any, charData: any): EquipmentSet {
        const equipmentSet: EquipmentSet = {};
        const items = $('span.item-wrapper', charData);
        items.each((i, itemData) => {
            const item: Item = {};
            const itemInfo = $('.item', itemData).first().attr();
            item.name = itemInfo?.title;
            if (!item.name?.match(/empty slot/i)) {
                const link = $('a', itemData).first().attr().href;
                item.realmEyeUrl = `${RealmEyeService._BASE_REALMEYE_URL}${link}`;
                item.renderPosition = itemInfo?.style?.split(':')[1]?.trim();
            }

            switch (i) {
                case 0:
                    equipmentSet.weapon = item;
                    break;
                case 1:
                    equipmentSet.ability = item;
                    break;
                case 2:
                    equipmentSet.armor = item;
                    break;
                case 3:
                    equipmentSet.ring = item;
                    break;
                case 4:
                    equipmentSet.backpack = item;
                    break;
            }
        });
        return equipmentSet;
    }

    private async addDungeonCompletions(ign: string, userData: UserData): Promise<void> {
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/graveyard-summary-of-player/${ign}`;
        const { data, status } = await this._RequestService.get(url);
        if (status !== 200) {
            return;
        }

        const completions: DungeonCompletions[] = [];

        const $ = cheerio.load(data);
        const completionsTable = $('table.main-achievements');
        $('tbody > tr', completionsTable).each((i, tableRow) => {
            const rowData = $('td', tableRow);
            const rowLabel: string = rowData.get(1)?.children[0]?.data;
            let dungeon;
            if (rowLabel?.match(/.*completed$/i) && !rowLabel?.match(/^quests.*/i)) {
                const name = rowLabel.replace(' completed', '');
                dungeon = findBestMatch(name, Array.from(RealmEyeService._DUNGEON_LIST));
            }
            if (dungeon) {
                const total = rowData.get(2)?.children[0]?.data;
                const num = total ? parseInt(total) : 0;
                // checks for cases like Lair of Draconis having two rows (easy & hard)
                if (completions.length && completions[completions.length-1].name === dungeon) {
                    completions[completions.length-1].completions += num;
                } else {
                    completions.push({
                        name: dungeon,
                        completions: num
                    });
                }
            }
        });
        userData.dungeonCompletions = completions;
    }

    public async getRealmEyeGuildData(guildName: string): Promise<GuildData> {
        const guildLinkName = guildName.replace(' ', '%20');
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/guild/${guildLinkName}`;
        const { data, status, statusText } = await this._RequestService.get(url);
        if (status !== 200) {
            throw new RealmEyeError(`Encountered a ${status} error when attempting to access RealmEye.`, {url: url, status: status, statusText: statusText});
        }

        const $ = cheerio.load(data);
        const container = $('.container');
        const guildNotFound = $('.col-md-12 > h2', container).first();
        if (guildNotFound?.text()?.match(/^sorry.*/i)) {
            throw new RealmEyeError(`${guildName} does not exist on RealmEye. Guild names are case sensitive, so be sure you're using the correct capitalization.`, {url: url});
        }

        const guildData: GuildData = {
            name: guildName,
            realmEyeUrl: url
        }

        const promises = [];
        promises.push(this.addTopGuildCharacters(guildLinkName, guildData));

        guildData.description = this.buildDescription($, container);
        this.addGuildTableInfo($, container, guildData);
        this.addGuildMemberData($, container, guildData);

        return Promise.all(promises).then(() => {
            return guildData;
        })
    }

    private async addTopGuildCharacters(guildLinkName: string, guildData: GuildData): Promise<void> {
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/top-characters-of-guild/${guildLinkName}`;
        const { data, status } = await this._RequestService.get(url);
        if (status !== 200) {
            return;
        }

        const $ = cheerio.load(data);
        const container = $('.container');
        guildData.topCharacters = this.buildCharacterData($, container, 'guild');
    }

    private addGuildTableInfo($: any, container: any, guildData: GuildData): void {
        const summaryTable = $('div table.summary', container)
        $('tr', summaryTable).each((i, e) => {
            const td = $('td', e);
            const rowTitle = td.first().text();
            const data = td.get(1);
            let num;
            switch (rowTitle.toLowerCase()) {
                case 'members':
                    num = data.children[0]?.data;
                    guildData.memberCount = num ? parseInt(num) : num;
                    break;
                case 'characters':
                    num = data.children[0]?.data;
                    guildData.characterCount = num ? parseInt(num) : num;
                    break;
                case 'fame':
                    const fame = $('span', data).first()?.text();
                    guildData.fame = fame ? parseInt(fame) : fame;
                    num = $('a', data).first()?.text();
                    guildData.fameRank = num ? parseInt(num) : num;
                    break;
                case 'exp':
                    const exp = $('span', data).first()?.text();
                    guildData.exp = exp ? parseInt(exp) : exp;
                    num = $('a', data).first()?.text();
                    guildData.expRank = num ? parseInt(num) : num;
                    break;
                case 'most active on':
                    guildData.server = $('a', data).first().text();
                    num = data.children[1]?.data?.replace(' (', '');
                    guildData.serverRank = num ? parseInt(num) : num;
                    break;
            }
        });
    }

    private addGuildMemberData($: any, container: any, guildData: GuildData): void {
        const membersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
        if (!membersTable.length) {
            return;
        }
        
        const memberTableIndexes = this.buildMemberTableIndexes($, membersTable);
        const members: UserData[] = [];
        $('tbody > tr', membersTable).each((i, memberRow) => {
            members.push(this.buildMember($, memberRow, memberTableIndexes));
        });
        guildData.members = members;
    }

    private buildMember($: any, memberRow: any, indexes: TableIndexes<UserData>): UserData {
        const member: UserData = {};
        $('td', memberRow).each((j, memberData) => {
            let num;
            switch (j) {
                case indexes.name:
                    const starContainer = $('.star-container', memberData).first();
                    if (starContainer.length) {
                        const star: string = $('.star', starContainer).first().attr()?.class?.match(/(star-.*)/)[1];
                        member.star = star?.substr(star?.indexOf('-') + 1);

                        const name = $('a', starContainer).first();
                        member.name = name.text();
                        member.realmEyeUrl = `${RealmEyeService._BASE_REALMEYE_URL}${name.attr()?.href}`;
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
                    member.avgExpChar = num ? 
                        num === 'N/A' ? 0 : parseInt(num)
                        : num;
                    break;
            }
        });
        return member;
    }

    private buildMemberTableIndexes($: any, membersTable: any): TableIndexes<UserData> {
        const indexes: TableIndexes<UserData> = {};
        $('thead th', membersTable).each((i, e) => {
            let heading: string = e.children[0]?.data;
            heading = heading || e.children[0]?.children[0]?.data; 
            if (!heading) {
                return;
            }
            switch (heading.toLowerCase()) {
                case 'name':
                    indexes.name = i;
                    break;
                case 'guild rank':
                    indexes.guildRank = i;
                    break;
                case 'fame':
                    indexes.fame = i;
                    break;
                case 'exp':
                    indexes.exp = i;
                    break;
                case 'rank':
                    indexes.rank = i;
                    break;
                case 'c':
                    indexes.characterCount = i;
                    break;
                case 'last seen':
                    indexes.lastSeen = i;
                    break;
                case 'srv.':
                    indexes.server = i;
                    break;
                case 'af/c':
                    indexes.avgFameChar = i;
                    break;
                case 'ae/c':
                    indexes.avgExpChar = i;
                    break;
            }
        });
        return indexes;
    }
}
