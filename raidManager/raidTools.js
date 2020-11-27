const tools = require("../general/tools");

/////////////////////////////////////////////////////////////////////
//**                    General Tools                              */
/////////////////////////////////////////////////////////////////////

module.exports.isNitroBooster = (guildMember, guildConfig) => {
    if (guildMember.roles.cache.find(memberRole => memberRole.id === guildConfig.boosterRole)) {
        return true;
    }
    return false;
};


/////////////////////////////////////////////////////////////////////
//**                   Formatting Tools                            */
/////////////////////////////////////////////////////////////////////

module.exports.formatRaidDescription = (client, description, guildId) => {
    let list = description.split(/\s+/);

    let actualDescription = ``;
    for (const part of list) {
        if (part === "") {
            continue;
        }
        if (actualDescription != "") {
            actualDescription += ` `;
        }
        const partTrim = part.trim();
        if (partTrim.startsWith("<") && partTrim.endsWith(">")) {
            const emoji = tools.getEmoji(client, partTrim, guildId);
            actualDescription += emoji ? `${emoji}` : `<EmojiNotFound>`;
        } else if (partTrim.startsWith("<") && (partTrim.charAt(partTrim.length-2) === ">")) {
            // handles punctuation after emoji ending
            const emoji = tools.getEmoji(client, partTrim.substring(0, partTrim.length-1), guildId);
            actualDescription += emoji ? `${emoji}` : `<EmojiNotFound>`;
            actualDescription += partTrim.charAt(partTrim.length-1);
        } else {
            actualDescription += part;
        }
    }
    return actualDescription;
};

module.exports.formatPrimaryEmoji = (client, raidTemplate, guildId) => {
    let primaryEmoji;
    if (raidTemplate.primaryEmoji) {
        primaryEmoji = tools.getEmoji(client, raidTemplate.primaryEmoji, guildId);
    }
    return primaryEmoji;
};

module.exports.formatSecondaryEmojis = (client, raidTemplate, guildId) => {
    let emojiList = [];
    for (let i=0; i<raidTemplate.secondaryNum; i++) {
        let currentEmoji;
        const emoji = raidTemplate.secondaryEmojis[i];
        if (emoji) {
            currentEmoji = tools.getEmoji(client, raidTemplate.secondaryEmojis[i], guildId);
            emojiList.push(currentEmoji);
        }
    }
    return emojiList;
};

module.exports.formatReactsListString = (client, raidTemplate, guildId) => {
    let reactsList = ``;
    for (let emoji of raidTemplate.reacts) {
        emoji = tools.getEmoji(client, emoji, guildId);
        reactsList += reactsList === "" ? `${emoji}` : ` ${emoji}`;
    }
    return reactsList != "" ? reactsList : "No reactions selected.";
};


/////////////////////////////////////////////////////////////////////
//**                    Template Tools                             */
/////////////////////////////////////////////////////////////////////

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