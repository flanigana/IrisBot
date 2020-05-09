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
        }
        
    }
    return channel;
}

module.exports.getChannelByName = (guild, name, msg) => {
    const channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === name.toLowerCase());
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel with name ${name}...`);
        }
    }
    return channel;
}

module.exports.getRoleById = (guild, id, msg) => {
    const role = guild.roles.cache.find(role => role.id === id);
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role with id ${id}...`);
        }
    }
    return role;
}

module.exports.getRoleByName = (guild, name, msg) => {
    const role = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role with name ${name}...`);
        }
    }
    return role;
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

module.exports.getArgs = command => {
    const split = command.split(" ");
    let args = [];
    for (let i=2; i<split.length; i++) {
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
                let item = {};
                item.imageUrl = equipment[j].children[0].attribs.href;
                if (equipment[j].children[0].attribs.title) {
                    item.itemName = "empty slot";
                } else {
                    item.itemName = equipment[j].children[0].children[0].attribs.title;
                }
                characterEquipment.push(item);
            }
            character.equipment = characterEquipment;

            characterList.push(character);
        }
        accountInfo.characters = characterList;

        return accountInfo;

    }).catch(console.error);
}