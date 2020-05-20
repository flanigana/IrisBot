const tools = require("../tools");

module.exports.formatRaidDescription = (client, description, emojiArray=false) => {
    let list = description;
    if (!emojiArray) {
        list = description.split(/\s+/);
    }

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
            const emoji = tools.getEmoji(client, partTrim);
            actualDescription += emoji ? `${emoji}` : `<EmojiNotFound>`;
        } else if (partTrim.startsWith("<") && (partTrim.charAt(partTrim.length-2) === ">")) {
            // handles punctuation after emoji ending
            const emoji = tools.getEmoji(client, partTrim.substring(0, partTrim.length-1));
            actualDescription += emoji ? `${emoji}` : `<EmojiNotFound>`;
            actualDescription += partTrim.charAt(partTrim.length-1);
        } else {
            actualDescription += part;
        }
    }
    return actualDescription;
}

module.exports.formatPrimaryEmoji = (client, raidTemplate) => {
    let primaryEmoji = undefined;
    if (raidTemplate.primaryEmoji) {
        primaryEmoji = tools.getEmoji(client, raidTemplate.primaryEmoji);
    }
    return primaryEmoji;
}

module.exports.formatSecondaryEmojis = (client, raidTemplate) => {
    let emojiList = [];
    for (let i=0; i<raidTemplate.secondaryNum; i++) {
        let currentEmoji = undefined;
        const emoji = raidTemplate.secondaryEmojis[i];
        if (emoji) {
            currentEmoji = tools.getEmoji(client, raidTemplate.secondaryEmojis[i]);;
            emojiList.push(currentEmoji);
        }
    }
    return emojiList;
}

module.exports.formatReactsListString = (client, raidTemplate) => {
    let reactsList = ``;
    for (emoji of raidTemplate.reacts) {
        emoji = tools.getEmoji(client, emoji);
        reactsList += reactsList === "" ? `${emoji}` : ` ${emoji}`;
    }
    return reactsList != "" ? reactsList : "No reactions selected.";
}