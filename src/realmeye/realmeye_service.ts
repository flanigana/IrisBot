import { injectable } from 'inversify';
import * as cheerio from 'cheerio';
import { RateLimitRequestService } from '../utilities/rate_limit_request_service';
import { RealmEyeError } from './realmeye_error';
import { Character, CharacterModelInfo, ClassList, DungeonCompletions, EquipmentSet, GuildData, Item, StatType, TableIndexes, RealmEyeUserData } from './realmeye_types';
import { StringUtils } from '../utilities/string_utils';
import { Status } from '../utilities/status';
import Logger from '../utilities/logging';

type InitializationSettings = {
    autoRetry: boolean,
    waitSecondsBeforeFirstRetry: number,
    maxAttempts: number,
    increaseSecondsBetweenFails: number
}

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
export abstract class RealmEyeService {

    private static readonly _BASE_REALMEYE_URL = 'https://www.realmeye.com';
    private static readonly _DUNGEON_LIST_SUB_URL = '/wiki/dungeons';

    private static readonly _DUNGEON_LIST: Set<string> = new Set();
    private static _CLASS_LIST: ClassList;

    private static _RequestService: RateLimitRequestService;
    private static _successfulInitialization: boolean;

    public static get dungeonList(): Set<string> {
        return RealmEyeService._DUNGEON_LIST;
    }

    public static get classList(): ClassList {
        return RealmEyeService._CLASS_LIST;
    }

    public static get successfulInitialization(): boolean {
        return RealmEyeService._successfulInitialization;
    }

    /**
     * Attempts to fully initialize the RealmEyeService.
     * Will retry failed initializations if autoRetry=true up to the given maxAttempt count
     * @param initializationSettings settings to use for initialization
     */
    public static async inititialize(initializationSettings: Partial<InitializationSettings>): Promise<void> {
        const status = Status.createPending();
        const promises = [];
        
        RealmEyeService._RequestService = new RateLimitRequestService(1, {headers: {'User-Agent': 'IrisBot RotMG Discord Bot'}});

        promises.push(RealmEyeService.attemptInitialization(RealmEyeService.buildDungeonList, initializationSettings).then(s => {
            status.merge(s);
        }));
        promises.push(RealmEyeService.attemptInitialization(RealmEyeService.buildClassList, initializationSettings).then(s => {
            status.merge(s);
        }));

        Promise.all(promises).then(() => {
            status.finalize();
            RealmEyeService._successfulInitialization = status.isPassed;
            if (status.isFailed) {
                Logger.error(`One or more RealmEyeService initializations have failed!`);
            } else {
                Logger.info(`RealmEyeService successfully initialized!`);
            }
        }).catch(error => {
            Logger.error('Unexpected error during RealmEyeService initialization', {error: error});
        });
    }

    /**
     * Attempts the given initialization function and will retry based on the settings given.
     * If autoRetry=false, no retries will be attempted for initialization and it will only try once.
     * Returns a passing Status if one of the initialization attempts passed, otherwise
     * returns a failing Status with the FailureReasons from all failed attempts.
     * @param initializationFunction function to use for initialization
     * @param initializationSettings settings to use for initialization
     */
    private static async attemptInitialization(
            initializationFunction: () => Promise<Status<any>>,
            {autoRetry = false, waitSecondsBeforeFirstRetry = 300, maxAttempts = 10, increaseSecondsBetweenFails = 60}: Partial<InitializationSettings>
        ): Promise<Status<any>> {

        let status = Status.createPending();
        try {
            status.merge(await initializationFunction());
        } catch (error) {
            if (error instanceof RealmEyeError) {
                status.addFailureReason({failure: `Initialization Error: ${initializationFunction.name} [RealmEye]`, failureMessage: `${Date.now}: ${error.name}-${error.message}`});
            } else {
                status.addFailureReason({failure: `Initialization Error: ${initializationFunction.name} [Other]`, failureMessage: `${Date.now}: ${error.name}-${error.message}`});
            }
        }

        if (status.isFailed && autoRetry) {
            while (status.failureReasons.length < maxAttempts) {
                Logger.warn(`Failed initialization: ${initializationFunction.name} attempt #${status.failureReasons.length} -- ${status.getLastFailure().failure}: ${status.getLastFailure().failureMessage}\n` +
                    `\tRetrying in ${waitSecondsBeforeFirstRetry} seconds...`);
                const retryStatus = await RealmEyeService.createInitializationInterval(initializationFunction, {waitSecondsBeforeFirstRetry: waitSecondsBeforeFirstRetry});
                if (retryStatus.isPassed) {
                    status = retryStatus;
                    break;
                } else {
                    status.merge(retryStatus);
                    waitSecondsBeforeFirstRetry += increaseSecondsBetweenFails;
                }
            }
            if (status.isFailed) {
                Logger.error(`Failed initialization: ${initializationFunction.name} and reached max attempts of ${maxAttempts}. No more initialization attempts will be made.`)
            }
        } else if (!status.isFailed) {
            Logger.info(`Successful initialization: ${initializationFunction.name}`);
        }

        return status.finalize();
    }

    /**
     * Creates a single-run interval that will attempt the given initialization function after the 
     * defined wait time (defined in seconds).
     * Returns the Status of the initialization attempt.
     * @param initializationFunction function to use for initialization
     * @param initializationSettings settings to use for initialization
     */
    private static async createInitializationInterval(
            initializationFunction: () => Promise<Status<any>>,
            {waitSecondsBeforeFirstRetry: waitSeconds = 300}: Partial<InitializationSettings>
    ): Promise<Status<any>> {
        return await new Promise(resolve => {
            const interval = setInterval(async () => {
                clearInterval(interval);
                const retryStatus = await RealmEyeService.attemptInitialization(initializationFunction, {autoRetry: false});
                resolve(retryStatus);
            }, waitSeconds*1000);
        });
    }

    private static async buildDungeonList(): Promise<Status<any>> {
        const status = Status.createPending();
        const url = `${RealmEyeService._BASE_REALMEYE_URL}${RealmEyeService._DUNGEON_LIST_SUB_URL}`;
        const { data, status: reqStatus, statusText } = await RealmEyeService._RequestService.get(url);
        if (reqStatus !== 200){
            throw new RealmEyeError('Error accessing RealmEye while initializing dungeon list.', {url: url, status: reqStatus, statusText: statusText});
        }

        const headingSelector = 'h2#realm-dungeons, h2#realm-event-dungeons, h2#oryx-s-castle, h2#mini-dungeons';
        const $ = cheerio.load(data) as any;
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
        return status.finalize();
    }

    private static async buildClassList(): Promise<Status<any>> {
        const status = Status.createPending();
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/wiki/classes`;
        const { data, status: reqStatus, statusText } = await RealmEyeService._RequestService.get(url);
        if (reqStatus !== 200){
            throw new RealmEyeError('Error accessing RealmEye while initializing class list.', {url: url, status: reqStatus, statusText: statusText});
        }
        const $ = cheerio.load(data);
        const tables = $('div.wiki-page > div.table-responsive > table');
        const classList: ClassList = {};
        for (let i=0; i < tables.length; i++) {
            if (i < tables.length -1) {
                RealmEyeService.addClassUrlsFromTable($, tables.get(i), classList);
            } else {
                RealmEyeService.addClassStatsFromTable($, tables.get(i), classList);
            }
        }
        RealmEyeService._CLASS_LIST = classList;
        return status.finalize();
    }

    private static addClassUrlsFromTable($: any, table: any, classList: ClassList): void {
        $('td', table).each((i, classCell) => {
            const classData = $('a', classCell).first();
            const classLink = `${RealmEyeService._BASE_REALMEYE_URL}${classData.attr()?.href}`;
            const img = $('img', classData).first();
            const className = img.attr()?.alt?.toUpperCase();
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

    private static addClassStatsFromTable($: any, table: any, classList: ClassList) {
        $('tbody > tr', table).each((i, classRow) => {
            const className = $('th a', classRow).first().text()?.toUpperCase();
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

    public static async getRealmEyeUserData(ign: string): Promise<RealmEyeUserData> {
        const baseUrl = `${RealmEyeService._BASE_REALMEYE_URL}/player`;
        const url = `${baseUrl}/${ign}`;
        const { data, status, statusText } = await RealmEyeService._RequestService.get(url);
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

        const userData:RealmEyeUserData = {
            name: name,
            realmEyeUrl: `${baseUrl}/${name}`
        }

        const promises = [];
        promises.push(RealmEyeService.addDungeonCompletions(ign, userData));

        userData.description = RealmEyeService.buildDescription($, container);
        RealmEyeService.addUserTableInfo($, container, userData);
        userData.characters = RealmEyeService.buildCharacterData($, container, 'user');

        return Promise.all(promises).then(() => {
            return userData;
        });
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

    private static addUserTableInfo($: any, container: any, userData: RealmEyeUserData): void {
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
                    const star: string = $('.star', starContainer).first().attr()?.class?.match(/(star-.*)/)[1];
                    userData.star = star?.substr(star?.indexOf('-')+1);
                    break;
                case 'ACCOUNT FAME':
                    num = $('span', data).first().text();
                    userData.accountFame = num ? parseInt(num) : num;
                    break;
                case 'GUILD':
                    const guild = $('a', data).first();
                    if (guild.length) {
                        userData.guild = guild.text();
                        userData.realmEyeGuildUrl = `${RealmEyeService._BASE_REALMEYE_URL}${guild.attr().href}`;
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

    private static buildCharacterData($: any, container: any, type: 'user'|'guild'): Character[] {
        if ($('.col-md-12 > h3', container)[0]?.children[0]?.data?.match(/characters are hidden/i)) {
            return;
        }
        const charactersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
        if (!charactersTable.length) {
            return;
        }
        
        const characterTableIndexes = RealmEyeService.buildCharacterTableIndexes($, charactersTable, type);
        const characters: Character[] = [];
        $('tbody > tr', charactersTable).each((i, charRow) => {
            characters.push(RealmEyeService.buildCharacter($, charRow, characterTableIndexes));
        });
        return characters;
    }

    private static buildCharacter($: any, charRow: any, indexes: TableIndexes<Character>): Character {
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
                    character.model = RealmEyeService.buildCharacterModelInfo(modelAttr);
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
                    character.equipment = RealmEyeService.buildCharacterEquipmentSet($, charData);
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

    private static buildCharacterTableIndexes($: any, charactersTable: any, type: 'user'|'guild'): TableIndexes<Character> {
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
                        indexes.model = i-1;
                    }
                    indexes.owner = i;
                case 'CLASS':
                    if (type === 'user') {
                        indexes.pet = i-2;
                        indexes.model = i-1;
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

    private static buildCharacterEquipmentSet($: any, charData: any): EquipmentSet {
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

    private static async addDungeonCompletions(ign: string, userData: RealmEyeUserData): Promise<void> {
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/graveyard-summary-of-player/${ign}`;
        const { data, status } = await RealmEyeService._RequestService.get(url);
        if (status !== 200) {
            return;
        }

        const completions: DungeonCompletions = {};

        const $ = cheerio.load(data) as any;
        const completionsTable = $('table.main-achievements');
        $('tbody > tr', completionsTable).each((i, tableRow) => {
            const rowData = $('td', tableRow);
            const rowLabel: string = rowData.get(1)?.children[0]?.data;
            let dungeon;
            if (rowLabel?.match(/.*completed$/i) && !rowLabel?.match(/^quests.*/i)) {
                const name = rowLabel.replace(' completed', '');
                dungeon = StringUtils.findBestMatch(name, Array.from(RealmEyeService._DUNGEON_LIST));
            }
            if (dungeon) {
                const total = rowData.get(2)?.children[0]?.data;
                const num = total ? parseInt(total) : 0;
                completions[dungeon] = num;
            }
        });
        userData.dungeonCompletions = completions;
    }

    public static async getRealmEyeGuildData(guildName: string): Promise<GuildData> {
        const guildLinkName = guildName.replace(' ', '%20');
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/guild/${guildLinkName}`;
        const { data, status, statusText } = await RealmEyeService._RequestService.get(url);
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
        promises.push(RealmEyeService.addTopGuildCharacters(guildLinkName, guildData));

        guildData.description = RealmEyeService.buildDescription($, container);
        RealmEyeService.addGuildTableInfo($, container, guildData);
        RealmEyeService.addGuildMemberData($, container, guildData);

        return Promise.all(promises).then(() => {
            return guildData;
        });
    }

    private static async addTopGuildCharacters(guildLinkName: string, guildData: GuildData): Promise<void> {
        const url = `${RealmEyeService._BASE_REALMEYE_URL}/top-characters-of-guild/${guildLinkName}`;
        const { data, status } = await RealmEyeService._RequestService.get(url);
        if (status !== 200) {
            return;
        }

        const $ = cheerio.load(data);
        const container = $('.container');
        guildData.topCharacters = RealmEyeService.buildCharacterData($, container, 'guild');
    }

    private static addGuildTableInfo($: any, container: any, guildData: GuildData): void {
        const summaryTable = $('div table.summary', container)
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

    private static addGuildMemberData($: any, container: any, guildData: GuildData): void {
        const membersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
        if (!membersTable.length) {
            return;
        }
        
        const memberTableIndexes = RealmEyeService.buildMemberTableIndexes($, membersTable);
        const members: RealmEyeUserData[] = [];
        $('tbody > tr', membersTable).each((i, memberRow) => {
            members.push(RealmEyeService.buildMember($, memberRow, memberTableIndexes));
        });
        guildData.members = members;
    }

    private static buildMember($: any, memberRow: any, indexes: TableIndexes<RealmEyeUserData>): RealmEyeUserData {
        const member: RealmEyeUserData = {};
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

    private static buildMemberTableIndexes($: any, membersTable: any): TableIndexes<RealmEyeUserData> {
        const indexes: TableIndexes<RealmEyeUserData> = {};
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

RealmEyeService.inititialize({autoRetry: true, waitSecondsBeforeFirstRetry: 30, maxAttempts: 3, increaseSecondsBetweenFails: 60});