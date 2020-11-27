const axios = require("axios");
const cheerio = require("cheerio");

/////////////////////////////////////////////////////////////////////
//**                           General                             */
/////////////////////////////////////////////////////////////////////

module.exports.getItemBaseName = itemName => {
    if (itemName.match(/T[0-9]$/) || itemName.endsWith("UT")) {
        return itemName.substring(0, itemName.length-3);
    } else if (itemName.match(/T[0-9]{2}$/)) {
        return itemName.substring(0, itemName.length-4);
    } else {
        return itemName;
    }
};

module.exports.getClassInfo = async (url) => {
    let options = {
        url: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    // initialize with basic data in case of failure
    let classes = {
        classList: ["Archer", "Huntress", "Bard", "Wizard", "Necromancer", "Mystic", "Sorcerer", "Priest", "Warrior", "Knight", "Paladin", "Rogue", "Trickster", "Assassin", "Ninja", "Samurai"],
        exists: false,
    };

    return axios(options).then(response => {
        classes.exists = true;
        const html = response.data;
        const $ = cheerio.load(html);

        const tables = $(".table-responsive > .table-striped");
        let statCapTable;
        let classList = [];

        for (let i=0; i < tables.length; i++) {
            if (tables[i].children[1].name === "caption") {
                statCapTable = tables[i];
                break;

            } else {
                const charactersRow = tables[i].children[3].children[1].children;
                for (let j=1; j < charactersRow.length; j+=2) {
                    const classInfo = {};
                    classInfo.className = charactersRow[j].children[0].children[0].children[0].attribs.alt.trim();
                    classList.push(classInfo.className);
                    let imgSource = charactersRow[j].children[0].children[0].children[0].attribs.src.trim();
                    if (imgSource.startsWith("/s/a/img")) {
                        classInfo.defaultSkin = `https://www.realmeye.com${imgSource}`;
                    } else {
                        classInfo.defaultSkin = `https:${imgSource}`;
                    }
                    classes[classInfo.className] = classInfo;
                }
            }
        }
        
        classes.classList = classList;

        const classRows = $(statCapTable).find("tbody > tr");
        for (let i=0; i < classRows.length; i++) {
            const className = classRows[i].children[1].children[0].children[0].children[0].data.trim();

            classes[className].maxHp = classRows[i].children[3].children[0].children[0].data;
            classes[className].maxMp = classRows[i].children[5].children[0].children[0].data;
            classes[className].maxAtt = classRows[i].children[7].children[0].children[0].data;
            classes[className].maxDef = classRows[i].children[9].children[0].children[0].data;
            classes[className].maxSpd = classRows[i].children[11].children[0].children[0].data;
            classes[className].maxDex = classRows[i].children[13].children[0].children[0].data;
            classes[className].maxVit = classRows[i].children[15].children[0].children[0].data;
            classes[className].maxWis = classRows[i].children[17].children[0].children[0].data;
        }
        return classes;

    }).catch(e => {
        console.error(`Axios failed to retrieve data from the page '${url}' with error code ${e.response.status}...`);
        return classes;
    });
};

module.exports.getRealmEyeDungeonsList = async () => {
    // uses IAlec's (my) realmeye page to grab dungeon list (I could hard code a list, but it wouldn't stay updated automatically)
    let options = {
        url: `https://www.realmeye.com/graveyard-summary-of-player/IAlec`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    return axios(options).then(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        const playerNameBox = $(".col-md-12")[0].children[0];
        const header = playerNameBox.children[0];
        if (header.data && header.data.startsWith("Sorry")) {
            return accountInfo;
        }

        let dungeons = [];
        const tbody = $(".table-responsive > .table > tbody > tr");
        for (let i=0; i < tbody.length; i++) {
            const rowTitle = tbody[i].children[1].children[0].data;
            if (!rowTitle.toLowerCase().endsWith("completed")) {
                continue;
            }
            const shortTitle = rowTitle.toLowerCase().substring(0, rowTitle.length-10);

            if (!shortTitle.toLowerCase().includes("quests")) {
                dungeons.push(shortTitle);
                // check for last dungeon
                if (shortTitle === "pirate caves") {
                    break;
                }
            }
        }
        return dungeons;
    }).catch(console.error);
};


/////////////////////////////////////////////////////////////////////
//**                             User                              */
/////////////////////////////////////////////////////////////////////

module.exports.getRealmEyeInfo = async (ign, graveyard, classInfo) => {
    const url = `https://www.realmeye.com/player/${ign}`;
    let promises = [];
    let options = {
        url: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    let accountInfo = {
        name: ign,
        url: url,
        status: -1,
        exists: false,
        charactersCount: 0,
        fame: 0,
        rank: 0,
        guild: "",
        guildRank: "",
        lastSeen: "",
        description: "",
        hiddenCharacters: false,
        characters: [],
    };

    promises.push(axios(options).then(async response => {
        accountInfo.status = response.status;
        const html = response.data;
        const $ = cheerio.load(html);

        const playerNameBox = $(".col-md-12")[0].children[0];
        const header = playerNameBox.children[0];
        if (header.data && header.data.startsWith("Sorry")) {
            return accountInfo;
        }

        // get proper name format
        const name = header.children[0].data;
        accountInfo.name = name;
        accountInfo.exists = true;

        // get summary table
        const summaryTable = $(".summary > tbody > tr");
        for (let i=0; i < summaryTable.length; i++) {
            const row = $(summaryTable[i]).find("td");
            const rowLabel = row[0].children[0].data.toLowerCase();

            if (rowLabel === "characters") {
                accountInfo.charactersCount = parseInt(row[1].children[0].data);

            } else if (rowLabel === "fame") {
                accountInfo.fame = parseInt(row[1].children[0].children[0].data);

            } else if (rowLabel === "rank") {
                accountInfo.rank = parseInt(row[1].children[0].children[0].data);

            } else if (rowLabel === "guild") {
                accountInfo.guild = row[1].children[0].children[0].data;
                
            } else if (rowLabel === "guild rank") {
                accountInfo.guildRank = row[1].children[0].data;
                
            } else if (rowLabel === "last seen") {
                if (row[1].children[0].data) {
                    accountInfo.lastSeen = row[1].children[0].data;
                } else {
                    accountInfo.lastSeen = row[1].children[0].children[0].data;
                    accountInfo.lastSeen += row[1].children[1].data;
                }
            }
        }

        // get description
        const description = $(".description-line");
        for (let i=0; i < description.length; i++) {
            if (description[i].children[0]) {
                if (accountInfo.description === "") {
                    accountInfo.description += description[i].children[0].data;
                } else {
                    accountInfo.description += "\n" + description[i].children[0].data;
                }
            }
        }

        // check if characters are hidden
        const characterHiddenHeader = $(".col-md-12 > h3")[0];
        if (characterHiddenHeader && characterHiddenHeader.children[0].data === "Characters are hidden") {
            accountInfo.hiddenCharacters = true;
        } else {
            let classPos = 0;
            let famePos = 0;
            let equipPos = 0;
            let statsPos = 0;
            const thead = $(".table-responsive > .table > thead > tr > th");
            for (let i=0; i < thead.length; i++) {
                if (thead[i].children && thead[i].children[0]) {
                    if (thead[i].children[0].data) {
                        if (thead[i].children[0].data.toLowerCase() === "class") {
                            classPos = i;
                        } else if (thead[i].children[0].data.toLowerCase() === "fame") {
                            famePos = i;
                        } else if (thead[i].children[0].data.toLowerCase() === "equipment") {
                            equipPos = i;
                        } else if (thead[i].children[0].data.toLowerCase() === "stats") {
                            statsPos = i;
                        }
                    }
                }
            }

            // get character table
            const characters = $(".table-responsive > .table > tbody > tr");
            let characterList = [];
            for (let i=0; i < characters.length; i++) {
                let character = {};

                const characterRow = characters[i];
                character.class = characterRow.children[classPos].children[0].data;
                character.fame = parseInt(characterRow.children[famePos].children[0].data);
                character.stats = characters[i].children[statsPos].children[0].children[0].data;

                // get equipment
                const equipment = characters[i].children[equipPos].children;
                let characterEquipment = [];
                for (let j=0; j < equipment.length; j++) {
                    // let item = {};
                    // item.itemUrl = equipment[j].children[0].attribs.href;
                    if (equipment[j].children[0].attribs.title) {
                        characterEquipment.push("empty slot");
                    } else {
                        const baseName = this.getItemBaseName(equipment[j].children[0].children[0].attribs.title);
                        characterEquipment.push(baseName);
                    }
                    // characterEquipment.push(item);
                }
                character.equipment = characterEquipment;

                if (classInfo) {
                    // get specific maxed stats
                    const dataStats = characters[i].children[statsPos].children[0].attribs["data-stats"];
                    const dataBonuses = characters[i].children[statsPos].children[0].attribs["data-bonuses"];
                    const statsSplit = dataStats.match(/-*\d+/g);
                    const bonusesSplit = dataBonuses.match(/-*\d+/g);
                    let adjustedStats = [];
                    for (let j=0; j < statsSplit.length; j++) {
                        adjustedStats[j] = parseInt(statsSplit[j]) - parseInt(bonusesSplit[j]);
                    }
                    character.maxHP = (classInfo[character.class].maxHP - adjustedStats[0]) === 0 ? true : false;
                    character.maxMP = (classInfo[character.class].maxMP - adjustedStats[1]) === 0 ? true : false;
                    character.maxAtt = (classInfo[character.class].maxAtt - adjustedStats[2]) === 0 ? true : false;
                    character.maxDef = (classInfo[character.class].maxDef - adjustedStats[3]) === 0 ? true : false;
                    character.maxSpd = (classInfo[character.class].maxSpd - adjustedStats[4]) === 0 ? true : false;
                    character.maxVit = (classInfo[character.class].maxVit - adjustedStats[5]) === 0 ? true : false;
                    character.maxWis = (classInfo[character.class].maxWis - adjustedStats[6]) === 0 ? true : false;
                    character.maxDex = (classInfo[character.class].maxDex - adjustedStats[7]) === 0 ? true : false;
                }

                characterList.push(character);
            }
            accountInfo.characters = characterList;
        }

        return accountInfo;

    }));

    if (graveyard) {
        options.url = `https://www.realmeye.com/graveyard-summary-of-player/${ign}`;
        promises.push(axios(options).then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
    
            const playerNameBox = $(".col-md-12")[0].children[0];
            const header = playerNameBox.children[0];
            if (header.data && header.data.startsWith("Sorry")) {
                return accountInfo;
            }
    
            let dungeons = {};
            const tbody = $(".table-responsive > .table > tbody > tr");
            for (let i=0; i < tbody.length; i++) {
                const rowTitle = tbody[i].children[1].children[0].data;
                if (!rowTitle.toLowerCase().endsWith("completed")) {
                    continue;
                }
    
                const shortTitle = rowTitle.toLowerCase().substring(0, rowTitle.length-10);
                if (!shortTitle.toLowerCase().includes("quests")) {
                    dungeons[shortTitle] = parseInt(tbody[i].children[2].children[0].data);
                    // check for last dungeon
                    if (shortTitle === "pirate caves") {
                        break;
                    }
                }
            }
            accountInfo.dungeons = dungeons;
            return accountInfo;
        }));
    }

    return Promise.all(promises).then(() => {
        return accountInfo;
    }).catch(e => {
        console.error(`Axios failed to retrieve data from the page '${url}' with error code ${e.response.status}...`);
        accountInfo.status = e.response.status;
        return accountInfo;
    });
};


/////////////////////////////////////////////////////////////////////
//**                            Guild                              */
/////////////////////////////////////////////////////////////////////

module.exports.getGuildUrlForm = guildName => {
    const split = guildName.split(" ");
    let url = `${split[0]}`;

    for (let i=1; i<split.length; i++) {
        if (split[i] === "") {
            continue;
        }
        url += `%20${split[i]}`;
    }

    return url;
};

module.exports.getTopCharacters = async guildName => {
    const url = this.getGuildUrlForm(guildName);
    const options = {
        url: `https://www.realmeye.com/top-characters-of-guild/${url}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    return axios(options).then(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        // get character table
        const characters = $(".table-responsive > .table > tbody > tr");
        let characterList = [];
        for (let i=0; i < characters.length; i++) {
            let character = {};

            const characterRow = characters[i];
            if (characterRow.children[2].children[0].data && characterRow.children[2].children[0].data === "Private") {
                continue;
            }
            character.name = characterRow.children[2].children[0].children[0].data;
            character.fame = parseInt(characterRow.children[3].children[0].data);
            character.class = characterRow.children[5].children[0].data;
            character.stats = characters[i].children[7].children[0].children[0].data;

            // get equipment
            const equipment = characters[i].children[6].children;
            let characterEquipment = [];
            for (let j=0; j < equipment.length; j++) {
                // let item = {};
                // item.itemUrl = equipment[j].children[0].attribs.href;
                if (equipment[j].children[0].attribs.title) {
                    characterEquipment.push("empty slot");
                } else {
                    const baseName = this.getItemBaseName(equipment[j].children[0].children[0].attribs.title);
                    characterEquipment.push(baseName);
                }
                // characterEquipment.push(item);
            }
            character.equipment = characterEquipment;

            characterList.push(character);
        }
        return characterList;
        
    }).catch(console.error);
};

module.exports.getRealmEyeGuildInfo = async guildName => {
    const url = `https://www.realmeye.com/guild/${this.getGuildUrlForm(guildName)}`;
    const options = {
        url: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    let guildInfo = {
        name: guildName,
        url: url,
        status: -1,
        exists: false,
        membersCount: 0,
        charactersCount: 0,
        fame: 0,
        fameRank: 0,
        server: "",
        serverRank: "",
        description: "",
        members: [],
    };

    return axios(options).then(response => {
        guildInfo.status = response.status;
        const html = response.data;
        const $ = cheerio.load(html);

        const guildNameBox = $(".col-md-12")[0].children[0];
        const header = guildNameBox.children[0];
        if (header.data && header.data.startsWith("Sorry")) {
            return guildInfo;
        }

        // get proper name format
        const name = header.children[0].data;
        guildInfo.name = name;
        guildInfo.exists = true;

        // get summary table
        const summaryTable = $(".summary > tbody > tr");
        for (let i=0; i < summaryTable.length; i++) {
            const row = $(summaryTable[i]).find("td");
            const rowLabel = row[0].children[0].data.toLowerCase();

            if (rowLabel === "members") {
                guildInfo.membersCount = parseInt(row[1].children[0].data);

            } else if (rowLabel === "characters") {
                guildInfo.charactersCount = parseInt(row[1].children[0].data);

            } else if (rowLabel === "fame") {
                guildInfo.fame = parseInt(row[1].children[0].children[0].data);
                guildInfo.fameRank = parseInt(row[1].children[2].children[0].data);

            } else if (rowLabel === "most active on") {
                guildInfo.server = row[1].children[0].children[0].data;
                guildInfo.serverRank = parseInt(row[1].children[1].data.substring(2));

            }
        }

        // get description
        const description = $(".description-line");
        for (let i=0; i < description.length; i++) {
            if (description[i].children[0]) {
                if (guildInfo.description === "") {
                    guildInfo.description += description[i].children[0].data;
                } else {
                    guildInfo.description += "\n" + description[i].children[0].data;
                }
            }
        }

        // get character table
        const members = $(".table-responsive > .table > tbody > tr");
        let membersList = [];
        let colMod = 0;
        for (let i=0; i < members.length; i++) {
            let member = {
            };

            const memberRow = members[i];

            if (memberRow.children[0].children.length === 0) {
                colMod = 1;
            } 
            
            if (memberRow.children[colMod+0].children[0].data && memberRow.children[colMod+0].children[0].data === "Private") {
                member.name = memberRow.children[colMod+0].children[0].data;
                member.guildRank = memberRow.children[colMod+1].children[0].data;

            } else {
                member.name = memberRow.children[colMod+0].children[0].children[0].children[0].data;
                member.guildRank = memberRow.children[colMod+1].children[0].data;
                member.fame = memberRow.children[colMod+2].children[0].children[0].data;
                member.rank = memberRow.children[colMod+4].children[0].data;
                member.charactersCount = memberRow.children[colMod+5].children[0].data;
            }
            membersList.push(member);
        }
        guildInfo.members = membersList;
        return this.getTopCharacters(guildName).then(topCharacters => {
            guildInfo.topCharacters = topCharacters;
            return guildInfo;
        });

    }).catch(e => {
        console.error(`Axios failed to retrieve data from the page '${url}' with error code ${e.response.status}...`);
        guildInfo.status = e.response.status;
        return guildInfo;
    });
};