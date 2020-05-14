const axios = require("axios");
const cheerio = require("cheerio");

module.exports.getGuildById = (client, id) => {
    return client.guilds.cache.find(guild => guild.id === id);
}

module.exports.getChannelById = (guild, id, msg) => {
    const channel = guild.channels.cache.find(channel => channel.id === id);
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel with id ${id}...`);
        } else {
            console.log(`Trouble finding channel with id ${id}...`);
        }
        
    }
    return channel;
}

module.exports.getChannelByName = (guild, name, msg) => {
    const channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === name.toLowerCase());
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel with name ${name}...`);
        } else {
            console.log(`Trouble finding channel with name ${name}...`);
        }
    }
    return channel;
}

module.exports.getRoleById = (guild, id, msg) => {
    const role = guild.roles.cache.find(role => role.id === id);
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role with id ${id}...`);
        } else {
            console.log(`Trouble finding role with id ${id}...`);
        }
    }
    return role;
}

module.exports.getRoleByName = (guild, name, msg) => {
    const role = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role with name ${name}...`);
        } else {
            console.log(`Trouble finding role with name ${name}...`);
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

module.exports.getCommand = (fullCommand, preCommand) => {
    const preCommandTrim = fullCommand.slice(preCommand.length+1);
    const command = preCommandTrim.split(" ")[0];
    return command;
}

module.exports.normalizeNaming = msg => {
    const split = msg.content.split(" ");
    let newContent = "";
    for (part of split) {
        let newPart = part;
        if (newPart.endsWith(",")) {
            newPart = newPart.slice(0, newPart.length-1);
        }
        if (newPart.startsWith("<") && newPart.endsWith(">")) {
            if (newPart.charAt(1) === "@" && newPart.charAt(2) === "&") {
                const role = this.getRoleById(msg.guild, newPart.slice(3, newPart.length-1));
                newPart = role.name;
            } else if (part.charAt(1) === "#") {
                const channel = this.getChannelById(msg.guild, newPart.slice(2, newPart.length-1));
                newPart = channel.name;
            }
        }
        if (newContent === "") {
            newContent += newPart;
        } else {
            newContent += " " + newPart;
        }
    }

    return newContent;
}

module.exports.getArgs = (command, commandLength) => {
    const split = command.split(" ");
    let args = [];
    for (let i=commandLength; i<split.length; i++) {
        const curr = split[i].trim();
        if (curr != "") {
            if (curr === "true") {
                args.push(true);
            } else if (curr === "false") {
                args.push(false);
            } else {
                args.push(curr);
            }
        }
    }
    return args;
}

module.exports.checkRolesConfigured = guildConfig => {
    if (!guildConfig.founderRole || !guildConfig.leaderRole || !guildConfig.officerRole || !guildConfig.memberRole || !guildConfig.initiateRole) {
        return false;
    } else {
        return true;
    }
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
        const classes = ["Rogue", "Archer", "Wizard", "Priest", "Warrior", "Knight", "Paladin", "Assassin", "Necromancer", "Huntress", "Mystic", 
            "Trickster", "Sorcerer", "Ninja", "Samurai"];
        value = classes[classValue];
    }

    return value;
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

module.exports.getRealmEyeInfo = async ign => {
    const options = {
        url: `https://www.realmeye.com/player/${ign}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    }

    let accountInfo = {
        name: ign,
        fame: 0,
        rank: 0,
        guild: "",
        guildRank: "",
        lastSeen: "",
        description: "",
        characters: [],
    };

    return axios(options).then(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        // get summary table
        const summaryTable = $(".summary > tbody > tr");
        for (let i=0; i < summaryTable.length; i++) {
            const row = $(summaryTable[i]).find("td");
            const rowLabel = row[0].children[0].data.toLowerCase();

            if (rowLabel === "characters") {
                accountInfo.characters = parseInt(row[1].children[0].data);

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

        // get character table
        const characters = $(".table-responsive > .table > tbody > tr");
        let characterList = [];
        for (let i=0; i < characters.length; i++) {
            let character = {
            };

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

        return accountInfo;

    }).catch(console.error);
}