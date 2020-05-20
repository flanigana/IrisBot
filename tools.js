const axios = require("axios");
const cheerio = require("cheerio");
const Discord = require("discord.js");

module.exports.getGuildById = (client, id) => {
    return client.guilds.cache.find(guild => guild.id === id);
}

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
}

module.exports.getChannelByName = (guild, name, type, msg) => {
    let channel = guild.channels.cache.find(channel => ((channel.name.toLowerCase() === name.toLowerCase()) && (channel.type === type)));
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel named **${name}**...`);
        }
        channel = undefined;
    }
    return channel;
}

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
}

module.exports.getRoleByName = (guild, name, msg) => {
    let role = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role named **${name}**...`);
        }
        role = undefined;
    }
    return role;
}

module.exports.getChannel = (guild, channelString, type, msg) => {
    let channel = undefined;
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
}

module.exports.getRole = (guild, roleString, msg) => {
    let role = undefined;
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
}

module.exports.getPrefix = async (guildId, db) => {
    return db.collection("guilds").doc(guildId).get().then(snapshot => {
        if (snapshot.exists) {
            const guildConfig = snapshot.data();
            return guildConfig.prefix;
        } else {
            return "!";
        }
    }).catch(console.error);
}

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
                    allArgs.push(curr);
                }
            } else if (curr === "true") {
                // converts true string to boolean
                allArgs.push(true);
                // convers false string to boolean
            } else if (curr === "false") {
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
}

module.exports.checkRolesConfigured = guildConfig => {
    if (!guildConfig.founderRole || !guildConfig.leaderRole || !guildConfig.officerRole || !guildConfig.memberRole || !guildConfig.initiateRole) {
        return false;
    } else {
        return true;
    }
}

module.exports.getClasses = () => {
    return ["Rogue", "Archer", "Wizard", "Priest", "Warrior", "Knight", "Paladin", "Assassin", "Necromancer", "Huntress", "Mystic", 
            "Trickster", "Sorcerer", "Ninja", "Samurai"];
}

module.exports.classEnumerator = classValue => {
    let value = null;

    if (typeof classValue === "string") {
        switch (classValue.toLowerCase()) {
            case "rogue":
                value = 0;
                break;
            case "archer":
                value = 1;
                break;
            case "wizard":
                value = 2;
                break;
            case "priest":
                value = 3;
                break;
            case "warrior":
                value = 4;
                break;
            case "knight":
                value = 5;
                break;
            case "paladin":
                value = 6;
                break;
            case "assassin":
                value = 7;
                break;
            case "necromancer":
                value = 8;
                break;
            case "huntress":
                value = 9;
                break;
            case "mystic":
                value = 10;
                break;
            case "trickster":
                value = 11;
                break;
            case "sorcerer":
                value = 12;
                break;
            case "ninja":
                value = 13;
                break;
            case "samurai":
                value = 14;
                break;
        }
    } else if (typeof classValue === "number") {
        const classes = this.getClasses();
        value = classes[classValue];
    }

    return value;
}

module.exports.getClientEmoji = (client, emojiName, trimEnds=false, frontTrim=0, backTrim=0) => {
    const emojiGuildIds = ["708761992705474680", "710578568211464192", "711504382394630194", "711491483588493313"];
    if (trimEnds) {
        emojiName = emojiName.substring(frontTrim, emojiName.length-backTrim);
    }
    return client.emojis.cache.find(emoji => ((emoji.name === emojiName) && emojiGuildIds.includes(emoji.guild.id)));
}

module.exports.isUnicodeEmoji = (emoji) => {
    const emojiRanges = [
        '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])' // U+1F680 to U+1F6FF
    ];
    if (emoji.match(emojiRanges.join('|'))) {
        return true;
    } else {
        return false;
    }
}

module.exports.getEmoji = (client, emojiName) => {
    if (this.isUnicodeEmoji(emojiName)) {
        return emojiName;
    } else if (emojiName.startsWith("<") && emojiName.endsWith(">")) {
        return this.getClientEmoji(client, emojiName, true, 1, 1);
    } else {
        return this.getClientEmoji(client, emojiName);
    }
}

module.exports.createClientEmojisList = client => {
    let types = ["Portal", "Key", "Class", "Ability"];
    let emojisList = new Array(types.length);
    client.emojis.cache.map(emoji => {
        for (let i=0; i<types.length; i++) {

            if (emoji.name.endsWith(types[i].toLowerCase())) {

                if (emojisList[i] === undefined) {
                    emojisList[i] = `${emoji}`;
                } else {
                    emojisList[i] += ` | ${emoji}`;
                }
            }
        }
    });

    return {
        types: types,
        emojisList: emojisList,
    }
}

module.exports.getItemBaseName = itemName => {
    if (itemName.match(/T[0-9]$/) || itemName.endsWith("UT")) {
        return itemName.substring(0, itemName.length-3);
    } else if (itemName.match(/T[0-9]{2}$/)) {
        return itemName.substring(0, itemName.length-4);
    } else {
        return itemName;
    }
}

module.exports.getStarColor = rank => {
    const starRequirements = [75, 60, 45, 30, 15, 0];

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
}

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
}

module.exports.getGuildConfig = async (id, db, msg) => {
    const doc = db.collection("guilds").doc(id);
    return doc.get().then(snapshot => {
        if (!snapshot.exists) {
            if (msg) {
                msg.channel.send("Server data not found!");
            } else {
                console.error("Server data not found!")
            }
            return undefined;
        }
        return snapshot.data();
    }).catch(console.error);
}

module.exports.getGuildName = async (id, db) => {
    return this.getGuildConfig(id, db).then(guildConfig => {
        return guildConfig.realmGuildName;
    });
}

module.exports.hasPermission = (guildMember, guildConfig, msg) => {
    const admin = guildMember.hasPermission("admin");

    if (!admin) {
        const permissions = guildConfig.permissions;
        for (role of permissions) {
            if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
                return true;
            }
        }
        if (msg) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("You do not have the required permissions to do that.")
            msg.channel.send(embed);
        }
        return false;
    } else {
        return true;
    }
}

module.exports.getRealmEyeInfo = async ign => {
    const options = {
        url: `https://www.realmeye.com/player/${ign}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    }

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

    return axios(options).then(response => {
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
            // get character table
            const characters = $(".table-responsive > .table > tbody > tr");
            let characterList = [];
            for (let i=0; i < characters.length; i++) {
                let character = {};

                const characterRow = characters[i];
                character.class = characterRow.children[2].children[0].data;
                character.fame = parseInt(characterRow.children[5].children[0].data);
                character.stats = characters[i].children[9].children[0].children[0].data;

                // get equipment
                const equipment = characters[i].children[8].children;
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
            accountInfo.characters = characterList;
        }

        return accountInfo;

    }).catch(console.error);
}

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
}

module.exports.getTopCharacters = async guildName => {
    const url = this.getGuildUrlForm(guildName);
    const options = {
        url: `https://www.realmeye.com/top-characters-of-guild/${url}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    }

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
}

module.exports.getRealmEyeGuildInfo = async guildName => {
    const url = this.getGuildUrlForm(guildName);
    const options = {
        url: `https://www.realmeye.com/guild/${url}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    }

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
}

module.exports.getStandardEmbed = client => {
    return new Discord.MessageEmbed()
    .setColor("#7542d4")
    .setFooter("Iris Bot", client.user.avatarURL())
    .setTimestamp();
}

module.exports.getHighestFame = characters => {
    let highestFame = 0;
    for (char of characters) {
        highestFame = char.fame > highestFame ? char.fame : highestFame;
    }
    return highestFame;
}

module.exports.isRaidLeader = (guildMember, guildConfig) => {
    const raidLeaderRoles = guildConfig.raidLeaderRoles;
    for (roleId of raidLeaderRoles) {
        if (guildMember.roles.cache.find(memberRole => memberRole.id === roleId)) {
            return true;
        }
    }
    return false;
}

module.exports.raidTemplateExists = (templateName, guildConfig) => {
    const templateNames = guildConfig.raidTemplateNames;
    for (let i=0; i<templateNames.length; i++) {
        if (templateNames[i].toLowerCase() === templateName.toLowerCase()) {
            return true;
        }
    }
    return false;
}

module.exports.getRaidTemplate = async (templateName, guildConfig, db, client, msg) => {
    let actualName = null;
    const templateNames = guildConfig.raidTemplateNames;
    for (let i=0; i<templateNames.length; i++) {
        if (templateNames[i].toLowerCase() === templateName.toLowerCase()) {
            actualName = templateNames[i]
        }
    }
    return db.collection("guilds").doc(`${guildConfig.guildId}`).collection("raidTemplates").doc(`${actualName}`).get().then(snapshot => {
        if (!snapshot) {
            if (msg) {
                const embed = this.getStandardEmbed(client)
                    .setTitle("No Raid Template Found")
                    .setDescription(`There is no existing raid template with the name ${templateName} for this server.`)
                msg.channel.send(embed);
            }
            return undefined
        }
        return snapshot.data();
    }).catch(console.error);
}
