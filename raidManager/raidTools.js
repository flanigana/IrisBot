const tools = require("../tools");

module.exports.formatRaidDescription = (client, description, guildId) => {
    let list = description.split(/\s+/);

    let actualDescription = ``;
    for (part of list) {
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
}

module.exports.formatPrimaryEmoji = (client, raidTemplate, guildId) => {
    let primaryEmoji = undefined;
    if (raidTemplate.primaryEmoji) {
        primaryEmoji = tools.getEmoji(client, raidTemplate.primaryEmoji, guildId);
    }
    return primaryEmoji;
}

module.exports.formatSecondaryEmojis = (client, raidTemplate, guildId) => {
    let emojiList = [];
    for (let i=0; i<raidTemplate.secondaryNum; i++) {
        let currentEmoji = undefined;
        const emoji = raidTemplate.secondaryEmojis[i];
        if (emoji) {
            currentEmoji = tools.getEmoji(client, raidTemplate.secondaryEmojis[i], guildId);;
            emojiList.push(currentEmoji);
        }
    }
    return emojiList;
}

module.exports.formatReactsListString = (client, raidTemplate, guildId) => {
    let reactsList = ``;
    for (emoji of raidTemplate.reacts) {
        emoji = tools.getEmoji(client, emoji, guildId);
        reactsList += reactsList === "" ? `${emoji}` : ` ${emoji}`;
    }
    return reactsList != "" ? reactsList : "No reactions selected.";
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

module.exports.isNitroBooster = (guildMember, guildConfig) => {
    if (guildMember.roles.cache.find(memberRole => memberRole.id === guildConfig.boosterRole)) {
        return true;
    }
    return false;
}