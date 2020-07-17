const axios = require("axios");
const cheerio = require("cheerio");
const Discord = require("discord.js");

module.exports.getGuildById = (client, id) => {
    return client.guilds.cache.find(guild => guild.id === id);
};

module.exports.getChannelById = (guild, id, msg) => {
    let channel = guild.channels.cache.find(channel => channel.id === id);
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel with id **${id}**...`);
        } else {
            console.log(`Trouble finding channel with id ${id}...`);
        }
        channel = undefined;
    }
    return channel;
};

module.exports.getChannelByName = (guild, name, type, msg) => {
    let channel = guild.channels.cache.find(channel => ((channel.name.toLowerCase() === name.toLowerCase()) && (channel.type === type)));
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel named **${name}**...`);
        }
        channel = undefined;
    }
    return channel;
};

module.exports.getRoleById = (guild, id, msg) => {
    let role = guild.roles.cache.find(role => role.id === id);
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role with id **${id}**...`);
        } else {
            console.log(`Trouble finding role with id ${id}...`);
        }
        role = undefined;
    }
    return role;
};

module.exports.getRoleByName = (guild, name, msg) => {
    let role = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role named **${name}**...`);
        }
        role = undefined;
    }
    return role;
};

module.exports.getChannel = (guild, channelString, type, msg) => {
    let channel;
    if (typeof channelString != "string") {
        console.error("Invalid type for channel. Expected string.");

    } else {
        if (channelString.startsWith("<#") && channelString.endsWith(">")) {
            channel = this.getChannelById(guild, channelString.slice(2, channelString.length-1));
        } else if ((channelString.startsWith("\"") && channelString.endsWith("\"")) || (channelString.startsWith("\'") && channelString.endsWith("\'"))) {
            channel = this.getChannelByName(guild, channelString.slice(1, channelString.length-1), type, msg);
        } else if (channelString.endsWith(","))  {
            channel = this.getChannelByName(guild, channelString.slice(0, channelString.length-1), type, msg);
        } else {
            channel = this.getChannelByName(guild, channelString, type, msg);
        }
    }
    return channel;
};

module.exports.getRole = (guild, roleString, msg) => {
    let role;
    if (typeof roleString != "string") {
        console.error("Invalid type for role. Expected string.");

    } else {
        if (roleString.startsWith("<@&") && roleString.endsWith(">")) {
            role = this.getRoleById(guild, roleString.substring(3, roleString.length-1));
        } else if ((roleString.startsWith("\"") && roleString.endsWith("\"")) || (roleString.startsWith("\'") && roleString.endsWith("\'"))) {
            role = this.getRoleByName(guild, roleString.substring(1, roleString.length-1), msg);
        } else if (roleString.endsWith(","))  {
            role = this.getRoleByName(guild, roleString.substring(0, roleString.length-1), msg);
        } else {
            role = this.getRoleByName(guild, roleString, msg);
        }
    }
    return role;
};

module.exports.getPrefix = async (guildId, db) => {
    return db.collection("guilds").doc(guildId).get().then(snapshot => {
        if (snapshot.exists) {
            const guildConfig = snapshot.data();
            return guildConfig.prefix;
        } else {
            return "!";
        }
    }).catch(console.error);
};

module.exports.getArgs = (fullCommand, p, commandsLength=0) => {
    if (p) {
        fullCommand = fullCommand.substring(p.length);
    }
    const split = fullCommand.split(" ");
    let allArgs = [];
    let openString = false;
    let opener = ``;
    let combinedArg = ``;
    for (let i=0; i<split.length; i++) {
        let curr = split[i].trim();
        if (curr != "") {
            if (curr.endsWith(",")) {
                // allows comma-separated args
                curr = curr.substring(0, curr.length-1);
            }
            if (openString) {
                // if a "long arg" formatted string is open
                if (curr.endsWith(opener)) {
                    // checks for ending of long arg such as ' arg" '
                    openString = false;
                    combinedArg += ` ${curr.substring(0, curr.length-1)}`;
                    allArgs.push(combinedArg);
                    combinedArg = ``;
                } else {
                    // add to current arg if it hasn't closed
                    combinedArg += ` ${curr}`;
                }

            } else if (curr.startsWith("\"") || curr.startsWith("\'")) {
                opener = curr.charAt(0);
                // if an arg is the beginning of a long are as "long arg"
                if (!curr.endsWith(opener)) {
                    // if the arg is not single arg surrounded by quotes of the same type such as "arg" or 'arg'
                    openString = true;
                    combinedArg = curr.substring(1);
                } else {
                    // resets opener if it is a single arg
                    opener = ``;
                    allArgs.push(curr.substring(1, curr.length-1));
                }
            } else if (curr.toLowerCase() === "true") {
                // converts true string to boolean
                allArgs.push(true);
                // convers false string to boolean
            } else if (curr.toLowerCase() === "false") {
                allArgs.push(false);
            } else {
                allArgs.push(curr);
            }
        }
    }
    if (combinedArg != "") {
        allArgs.push(combinedArg);
    }

    return allArgs.slice(commandsLength);
};

module.exports.getGuildEmoji = (client, guildId, emojiName, trimEnds=false, frontTrim=0, backTrim=0) => {
    let emojiGuildIds = ["710578568211464192", "708761992705474680", "711504382394630194", "711491483588493313"];
    if (guildId) {
        emojiGuildIds.push(guildId);
    }
    if (trimEnds) {
        emojiName = emojiName.substring(frontTrim, emojiName.length-backTrim);
    }
    return client.emojis.cache.find(emoji => ((emoji.name === emojiName) && emojiGuildIds.includes(emoji.guild.id)));
};

module.exports.isUnicodeEmoji = (emoji) => {
    const emojiRanges = [
        '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])' // U+1F680 to U+1F6FF
    ];
    if (emoji.match(emojiRanges.join('|'))) {
        return true;
    } else {
        return false;
    }
};

module.exports.getEmoji = (client, emojiName, guildId) => {
    if (this.isUnicodeEmoji(emojiName)) {
        return emojiName;
    } else if (emojiName.startsWith("<") && emojiName.endsWith(">")) {
        return this.getGuildEmoji(client, guildId, emojiName, true, 1, 1);
    } else {
        return this.getGuildEmoji(client, guildId, emojiName);
    }
};

module.exports.createClientEmojisList = (client, guild) => {
    let types = ["Portal", "Key", "Class", "Ability"];
    let typesLength = types.length;
    let emojisList = {};
    let guildLength = 0;

    client.emojis.cache.map(emoji => {
        for (let i=0; i<typesLength; i++) {
            if (emoji.name.endsWith(types[i].toLowerCase())) {
                if (emojisList[`${types[i]}`] === undefined) {
                    emojisList[`${types[i]}`] = `${emoji}`;
                } else {
                    emojisList[`${types[i]}`] += ` | ${emoji}`;
                }
            }
        }
        if (guild && (emoji.guild === guild)) {
            const emojiString = `${emoji}`;

            if (emojisList[`Guild_${guildLength}`] === undefined) {
                types.push(`Guild_${guildLength}`);
                emojisList[`Guild_${guildLength}`] = emojiString;

            } else if ((emojisList[`Guild_${guildLength}`].length + ` | ${emojiString}`.length) < 1024) {
                emojisList[`Guild_${guildLength}`] += ` | ${emojiString}`;

            } else {
                guildLength++;
                types.push(`Guild_${guildLength}`);
                emojisList[`Guild_${guildLength}`] = emojiString;
            }
        }
    });

    emojisList.types = types;

    return emojisList;
};

module.exports.getItemBaseName = itemName => {
    if (itemName.match(/T[0-9]$/) || itemName.endsWith("UT")) {
        return itemName.substring(0, itemName.length-3);
    } else if (itemName.match(/T[0-9]{2}$/)) {
        return itemName.substring(0, itemName.length-4);
    } else {
        return itemName;
    }
};

module.exports.getStarColor = rank => {
    const starRequirements = [80, 64, 48, 32, 16, 0];

    if (rank === starRequirements[0]) {
        return "white";
    } else if (rank >= starRequirements[1]) {
        return "yellow";
    } else if (rank >= starRequirements[2]) {
        return "yellow";
    }  else if (rank >= starRequirements[3]) {
        return "orange";
    }  else if (rank >= starRequirements[4]) {
        return "blue";
    } else {
        return "light blue";
    }
};

module.exports.getUserIgn = async (id, db) => {
    return db.collection("users").doc(id).get().then(snapshot => {
        if (!snapshot.exists) {
            return null;
        }

        const userData = snapshot.data();
        if (!userData.ign) {
            return null;
        }

        return userData.ign;
    }).catch(console.error);
};

module.exports.getGuildConfig = async (id, db, msg) => {
    const doc = db.collection("guilds").doc(id);
    return doc.get().then(snapshot => {
        if (!snapshot.exists) {
            if (msg) {
                msg.channel.send("Server data not found! You may need to kick the bot from the server and re-invite it in order for it to work. If it continues not to function, contact the bot owner.");
            }
            return undefined;
        }
        return snapshot.data();
    }).catch(console.error);
};

module.exports.getGuildName = async (id, db) => {
    return this.getGuildConfig(id, db).then(guildConfig => {
        return guildConfig.realmGuildName;
    });
};

module.exports.isAdmin = (guildMember, guildConfig) => {
    if (guildMember.user.id === guildConfig.guildOwner || guildMember.user.id === "225044370930401280") {
        return true;
    }

    const admins = guildConfig.admins;
    for (const role of admins) {
        if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
            return true;
        }
    }
    return false;
};

module.exports.isMod = (guildMember, guildConfig) => {
    const mod = this.isAdmin(guildMember, guildConfig);

    if (!mod) {
        const mods = guildConfig.mods;
        for (const role of mods) {
            if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
                return true;
            }
        }
        return false;
    } else {
        return true;
    }
};

module.exports.isRaidLeader = (guildMember, guildConfig) => {
    const raidLeaderRoles = guildConfig.raidLeaderRoles;
    for (const roleId of raidLeaderRoles) {
        if (guildMember.roles.cache.find(memberRole => memberRole.id === roleId)) {
            return true;
        }
    }
    return false;
};

module.exports.getClassInfo = async () => {
    let options = {
        url: `https://www.realmeye.com/wiki/classes`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    let classes = {};

    return axios(options).then(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        const tables = $(".table-responsive > .table-striped");
        let statCapTable;

        for (let i=0; i < tables.length; i++) {
            if (tables[i].children[1].name === "caption") {
                statCapTable = tables[i];
                break;

            } else {
                const charactersRow = tables[i].children[3].children[1].children;
                for (let j=1; j < charactersRow.length; j+=2) {
                    const classInfo = {};
                    classInfo.className = charactersRow[j].children[0].children[0].children[0].attribs.alt.trim();
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

    }).catch(console.error);
};

module.exports.getRealmEyeInfo = async (ign, graveyard, classInfo) => {
    let promises = [];
    let options = {
        url: `https://www.realmeye.com/player/${ign}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    let accountInfo = {
        name: ign,
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
    }).catch(console.error);
};

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
    const url = this.getGuildUrlForm(guildName);
    const options = {
        url: `https://www.realmeye.com/guild/${url}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    };

    let guildInfo = {
        name: guildName,
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

    }).catch(console.error);
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

module.exports.getStandardEmbed = client => {
    return new Discord.MessageEmbed()
    .setColor("#7542d4")
    .setFooter("Iris Bot", client.user.avatarURL())
    .setTimestamp();
};

module.exports.getHighestFame = characters => {
    let highestFame = 0;
    for (char of characters) {
        highestFame = char.fame > highestFame ? char.fame : highestFame;
    }
    return highestFame;
};

module.exports.verificationChannelUsed = (channelId, guildConfig) => {
    const templateList = guildConfig.verificationTemplateNames;
    for (let i=0; i<templateList.length; i++) {
        /**
         *  verification templates are stored in the database with the name and id to quickly check for the related verification channel
         *  this then looks like "templateName | channel.id" in the verificationTemplateNames variable in the db
        */
        const tempChannelId = templateList[i].split(" | ")[1].trim();
        if (tempChannelId === channelId) {
            return true;
        }
    }
    return false;
};

module.exports.verificationTemplateExists = (template, guildConfig) => {
    const templateList = guildConfig.verificationTemplateNames;
    let channelId;
    if (template.startsWith("<#") && template.endsWith(">")) {
        channelId = template.substring(2, template.length-1);
    }
    for (let i=0; i<templateList.length; i++) {
        /**
         *  verification templates are stored in the database with the name and id to quickly check for the related verification channel
         *  this then looks like "templateName | channel.id" in the verificationTemplateNames variable in the db
        */
        if (channelId) {
            const templateSplit = templateList[i].split(" | ");
            const tempChannelId = templateSplit[1].trim();
            if (tempChannelId === channelId) {
                return templateSplit[0].trim();
            }

        } else {
            const listName = templateList[i].split(" | ")[0].trim();
            if (listName.toLowerCase() === template.toLowerCase()) {
                return listName;
            }
        }
    }
    return undefined;
};

module.exports.getVerificationTemplate = async (client, msg, templateName, guildConfig, db) => {
    let actualName;
    const templateList = guildConfig.verificationTemplateNames;
    for (let i=0; i<templateList.length; i++) {
        /**
         *  verification templates are stored in the database with the name and id to quickly check for the related verification channel
         *  this then looks like "templateName | channel.id" in the verificationTemplateNames variable in the db
        */
        const listName = templateList[i].split(" | ")[0].trim();
        if (listName.toLowerCase() === templateName.toLowerCase()) {
            actualName = listName;
        }
    }
    return db.collection("guilds").doc(`${guildConfig.guildId}`).collection("verificationTemplates").doc(`${actualName}`).get().then(snapshot => {
        if (!snapshot) {
            if (msg) {
                const embed = this.getStandardEmbed(client)
                    .setTitle("No Raid Template Found")
                    .setDescription(`There is no existing raid template with the name ${templateName} for this server.`);
                msg.channel.send(embed);
            }
            return undefined;
        }
        return snapshot.data();
    }).then(template => {
        if (template) {
            if (template.verificationChannel) {
                template.verificationChannel = this.getChannelById(msg.guild, template.verificationChannel, "text");
            }
            if (template.logChannel) {
                template.logChannel = this.getChannelById(msg.guild, template.logChannel, "text");
            }
            if (template.guildRoles) {
                template.founderRole = this.getRoleById(msg.guild, template.founderRole);
                template.leaderRole = this.getRoleById(msg.guild, template.leaderRole);
                template.officerRole = this.getRoleById(msg.guild, template.officerRole);
                template.memberRole = this.getRoleById(msg.guild, template.memberRole);
                template.initiateRole = this.getRoleById(msg.guild, template.initiateRole);
            }
            if (template.verifiedRole) {
                template.verifiedRole = this.getRoleById(msg.guild, template.verifiedRole);
            }
            return template;
        } else {
            return undefined;
        }
    }).catch(console.error);
};

module.exports.raidTemplateExists = (templateName, guildConfig) => {
    const templateList = guildConfig.raidTemplateNames;
    for (let i=0; i<templateList.length; i++) {
        if (templateList[i].toLowerCase() === templateName.toLowerCase()) {
            return templateList[i];
        }
    }
    return undefined;
};

module.exports.getRaidTemplate = async (templateName, guildConfig, db, client, msg) => {
    let actualName;
    const templateList = guildConfig.raidTemplateNames;
    for (let i=0; i<templateList.length; i++) {
        if (templateList[i].toLowerCase() === templateName.toLowerCase()) {
            actualName = templateList[i];
        }
    }
    return db.collection("guilds").doc(`${guildConfig.guildId}`).collection("raidTemplates").doc(`${actualName}`).get().then(snapshot => {
        if (!snapshot) {
            if (msg) {
                const embed = this.getStandardEmbed(client)
                    .setTitle("No Raid Template Found")
                    .setDescription(`There is no existing raid template with the name ${templateName} for this server.`);
                msg.channel.send(embed);
            }
            return undefined;
        }
        return snapshot.data();
    }).catch(console.error);
};
