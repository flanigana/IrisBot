import { injectable } from 'inversify';
import * as cheerio from 'cheerio';
import { RateLimitRequestService } from '../utilities/rate_limit_request_service';
import { RealmEyeError } from './realmeye_exception';
import { Character, CharacterModelInfo, CharacterTableIndexes, EquipmentSet, Item, UserData } from './realmeye_types';
import { ChannelCreationOverwrites } from 'discord.js';
// const cheerio = require('cheerio');

export class RealmEyeService {

    private readonly _RequestService: RateLimitRequestService;

    public constructor() {
        this._RequestService = new RateLimitRequestService(1, {headers: {'User-Agent': 'IrisBot RotMG Discord Bot'}});
    }

    public async getRealmEyeUserData(ign: string): Promise<UserData> {
        const url = `https://www.realmeye.com/player/${ign}`;
        const { data, status, statusText } = await this._RequestService.get(url);
        if (status !== 200) {
            throw new RealmEyeError(`Encountered a ${status} error when attempting to access RealmEye.`, status, statusText);
        }

        const userData:UserData = {realmEyeUrl: url};

        const $ = cheerio.load(data);
        const container = $('.container');
        const playerNotFound = $('.player-not-found', container);
        if (playerNotFound.length) {
            throw new RealmEyeError(`${ign}'s RealmEye profile could not be found. The profile is either private or does not exist.`);
        }

        userData.name = $('div h1 .entity-name', container).text();
        this.addUserTableInfo($, container, userData);
        this.addUserDescription($, container, userData);
        this.addCharacterData($, container, userData);

        return userData;
    }

    private addUserDescription($, container, userData: UserData): void {
        const userDescription = $('.description', container).first();
        let description = '';
        $('.description-line', userDescription).each((i, line) => {
            const text = line.children[0]?.data || '';
            description += !description ? text : `\n${text}`;
        });
        userData.description =  description;
    }

    private addUserTableInfo($, container, userData: UserData): void {
        const summaryTable = $('div table.summary', container)
        $('tr', summaryTable).each((i, e) => {
            const td = $('td', e);
            const rowTitle = td.first().text();
            const data = td.get(1);
            switch (rowTitle.toLowerCase()) {
                case 'skins':
                    userData.skins = $('span', data).first().text();
                    break;
                case 'exaltations':
                    userData.exaltations = $('span', data).first().text();
                    break;
                case 'fame':
                    userData.fame = $('span', data).first().text();
                    break;
                case 'exp':
                    userData.exp = $('span', data).first().text();
                    break;
                case 'rank':
                    const starContainer = $('.star-container', data).first();
                    userData.rank = starContainer.text();
                    const star: string = $('div', starContainer).first().attr().class.match(/(star-.*)/)[1];
                    userData.star = star.substr(star.indexOf('-')+1);
                    break;
                case 'account fame':
                    userData.accountFame = $('span', data).first().text();
                    break;
                case 'guild':
                    const guild = $('a', data).first();
                    userData.guild = guild.text();
                    userData.realmEyeGuildUrl = `https://www.realmeye.com${guild.attr().href}`;
                    break;
                case 'guild rank':
                    userData.guildRank = data.children[0].data;
                    break;
                case 'created':
                    userData.created = data.children[0].data;
                    break;
                case 'last seen':
                    if (data.children[0].data) {
                        userData.lastSeen = data.children[0].data;
                    } else {
                        userData.lastSeen = data.children[0].children[0].data + data.children[1].data;
                    }
                    break;
            }
        });
    }

    private addCharacterData($, container, userData: UserData): void {
        if ($('.col-md-12 > h3', container)[0]?.children[0]?.data?.match(/characters are hidden/i)) {
            return;
        }
        const charactersTable = $('.col-md-12 > .table-responsive > table.table.table-striped.tablesorter', container);
        if (!charactersTable.length) {
            return;
        }
        
        const characterTableIndexes = this.buildCharacterTableIndexes($, charactersTable);
        const characters: Character[] = [];
        $('tbody > tr', charactersTable).each((i, charRow) => {
            const character: Character = {};
            $('td', charRow).each((j, charData) => {
                switch (j) {
                    case characterTableIndexes.model:
                        const modelAttr = $('.character', charData).first().attr();
                        character.model = this.buildCharacterModelInfo(modelAttr);
                        if (i === 0)
                        break;
                    case characterTableIndexes.class:
                        character.class = charData.children[0]?.data;
                        break;
                    case characterTableIndexes.level:
                        const level = charData.children[0]?.data
                        character.level = level ? parseInt(level) : 0;
                        break;
                    case characterTableIndexes.fame:
                        const fame = charData.children[0]?.data;
                        character.fame = fame ? parseInt(fame) : 0;
                        break;
                    case characterTableIndexes.exp:
                        const exp = charData.children[0]?.data;
                        character.exp = exp ? parseInt(exp) : 0;
                        break;
                    case characterTableIndexes.place:
                        const place = $('a', charData).first().text();
                        character.place = place ? parseInt(place) : 0;
                        break;
                    case characterTableIndexes.equipment:
                        character.equipment = this.buildCharacterEquipmentSet($, charData);
                        break;
                    case characterTableIndexes.stats:
                        // TODO: use stats below to check specific maxed stats once RealmEye has the information available again
                        // const stats = $('.player-stats', charData).first().attr();
                        character.maxedStats = charData.children[0]?.children[0]?.data;
                        break;
                }
            });
            characters.push(character);
        });
        userData.characters = characters;
    }

    private buildCharacterTableIndexes($, charactersTable): CharacterTableIndexes {
        const indexes: CharacterTableIndexes = {};
        $('thead th', charactersTable).each((i, e) => {
            let heading: string = e.children[0]?.data;
            heading = heading ? heading : e.children[0]?.children[0]?.data;
            if (!heading) {
                return;
            }
            switch (heading.toLowerCase()) {
                case 'class':
                    indexes.pet = i-2;
                    indexes.model = i-1;
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
            }
        });
        return indexes;
    }

    private buildCharacterModelInfo(modelData): CharacterModelInfo {
        const modelInfo: CharacterModelInfo = {};
        modelInfo.charactersWithOutfitUrl = `https://www.realmeye.com${modelData.href}`;
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

    private buildCharacterEquipmentSet($, charData): EquipmentSet {
        const equipmentSet: EquipmentSet = {};
        const items = $('span.item-wrapper', charData);
        items.each((i, itemData) => {
            const item: Item = {};
            const link = $('a', itemData).first().attr().href;
            item.realmEyeUrl = `https://www.realmeye.com${link}`;
            const itemInfo = $('.item', itemData).first().attr();
            item.name = itemInfo.title;
            item.renderPosition = itemInfo?.style?.split(':')[1]?.trim();

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
}