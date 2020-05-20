const tools = require("../tools");
const raidTools = require("./raidTools");

const addClientEmojisToEmbed = (clientEmojisList, embed) => {
    const types = clientEmojisList.types;
    const emojisList = clientEmojisList.emojisList;
    for (let i=0; i<types.length; i++) {
        embed = embed.addField(`${types[i]}`, `${emojisList[i]}`);
    }
    return embed;
}

const leftUndefined = raidTemplate => {
    if (!raidTemplate.name) {
        return true;
    }
    if (!raidTemplate.description) {
        return true;
    }
    if (!raidTemplate.primaryEmoji) {
        return true;
    }
}

const displayCancelledPage = (client, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`Raid Template Was Cancelled`);
    msg.edit(embed);
}

const displayStartPage = (client, raidTemplate, type, msg, pageInfo, first=false) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${type} a Raid Template`)
        .setDescription(`In order to ${type.toLowerCase()} raid template, you will need to respond to each parameter.
To do this, simply type a response in this channel whenever asked.
\nWhenever typing a custom emoji enter it as **<emojiname>** otherwise, you can just type an emoji like :100:.
\nTo switch setup pages, use the ⬅ and ➡ reactions.
To cancel this command at any time, react with ❌.
**Doing this will discard all progress and changes.**
\nTo begin, react with ➡.`)
        .addField("Note", `This setup will time out after remaining on the same page for 5 minutes.`)
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    if (first) {
        return embed;
    }
    msg.edit(embed);
}

const displayNamePage = (client, p, raidTemplate, guildConfig, msg, alreadyExists=false, attemptedRes, pageInfo) => {
    let existingNames = ``;
    for (name of guildConfig.raidTemplateNames) {
        if (existingNames === "") {
            existingNames += `${name}`;
        } else {
            existingNames += ` | ${name}`;
        }
    }
    if (existingNames === "") {
        existingNames = "No existing raid template names."
    }

    let embed = tools.getStandardEmbed(client)
        .setTitle("Raid Template Name")
        .setDescription(`Respond with the name you would like to use for this raid template. It cannot be the same name as an existing template.
If you would like to edit an existing raid, use the \`${p}raid edit <templateName>\` command.
\n**Note:** Raid names should not include spaces. If you want to seperate words use a hyphen (-) or underscore (_).`)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Name", value: `**${raidTemplate.name}**`, inline: true},
            {name: "Existing Names", value: `${existingNames}`, inline: true}
            );

    if (alreadyExists) {
        embed = embed.setDescription(`${attemptedRes} already exists as a raid name! Please respond with a new name that does not already exist or use the raid editing command to update it.`)

    } else {
        embed = embed.setDescription("Respond with the desired name for this raid template. It should not be the same as an existing one.")
    }
    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const displayDescriptionPage = (client, raidTemplate, clientEmojisList, msg, pageInfo) => {
    let description =  undefined;
    if (raidTemplate.description) {
        description = raidTools.formatRaidDescription(client, raidTemplate.description);
    }

    const exampleDescription = `Please react with <losthallsportal> in order to be included in the raid. If you have a key, please react with <losthallskey>.
We would like to get at least 5 <warriorclass>, <knightclass>, and <paladinclass> for this raid.`;
    const actualExample = raidTools.formatRaidDescription(client, exampleDescription);

    let embed = tools.getStandardEmbed(client)
        .setTitle(`${raidTemplate.name} Description`)
        .setDescription(`Respond with your desired description to display when this raid begins.
\nRemember to type any custom emojis as **<emojiname>**.
\nAll available emojis you can use are listed below.`)
        .addFields(
            {name: "Example", value: `\`\`\`${exampleDescription}\`\`\``},
            {name: "Example Appearance", value: `${actualExample}`},
        );

    embed = addClientEmojisToEmbed(clientEmojisList, embed);
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Description", value: `${description}`},
    )
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const displayPrimaryEmojiPage = (client, raidTemplate, clientEmojisList,  msg, pageInfo) => {
    let primaryEmoji = raidTools.formatPrimaryEmoji(client, raidTemplate);
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${raidTemplate.name} Primary React`)
        .setDescription(`Respond with the emoji you would like raiders to react with in order to be counted in the raid and subsequently moved into the destination channel.
\nAdditionally, you can respond with a number in order to require a minimum number of reacts for the raid to pass. Leave this blank or use 0 if you don't want a minimum.
\nThe number of reacts will be checked before starting the raid, and if there aren't enough, the raid will fail.
\nRemember to type any custom emojis as **<emojiname>**.
\nAll available emojis you can use are listed below.`)
        .addField("Examples", `\`<losthallsportal>\` or \`<losthallsportal> 10\``);

    embed = addClientEmojisToEmbed(clientEmojisList, embed);
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Primary React", value: `${primaryEmoji}`, inline: true},
        {name: "Minimum Reacts", value: `${raidTemplate.primaryMin}`, inline: true},
    )
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const displaySecondarySetupPage = (client, raidTemplate, msg, pageInfo) => {
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${raidTemplate.name} Secondary Reaction Count`)
        .setDescription(`Respond with the number of secondary reactions you would like this template to have.
A secondary reaction is a reaction that requires a minimum number of reacts in order for the raid to pass. This is useful for things like key requirements.
For example, when doing a void, you can set up two secondary reactions: one for a Lost Halls key and one for a Vial.
For a cult, you don't need a vial, so you may only wish to have a single secondary reaction for a Lost Halls key.
\nAfter specifying the number of secondary reactions, you will be asked to identify each emoji and the minimum number of reactions for each.
\nAdditionally, you will be asked at the end to specify and additional emojis you would like to add that don't require any minimum and can be listed together.
\nIt is recommended to not have more than 15 reaction emojis in total.`)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Number of Secondary Reactions", value: `${raidTemplate.secondaryNum}`}
        )
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const displaySecondaryEmojiPage = (client, raidTemplate, clientEmojisList,  msg, pageInfo) => {
    let secondaryEmoji = undefined;
    const emoji = raidTemplate.secondaryEmojis[pageInfo.currentSecondaryPos-1];
    if (emoji) {
        const guildEmoji = tools.getEmoji(client, emoji);
        secondaryEmoji = guildEmoji ? guildEmoji : emoji;
    }
    
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${raidTemplate.name} Secondary React ${pageInfo.currentSecondaryPos} of ${raidTemplate.secondaryNum}`)
        .setDescription(`Respond with the emoji you would like to be used an additional check. This is best used as a key check by using a key emoji and setting the min as 1.
\nThe number of reacts will be checked before starting the raid, and if there aren't enough, the raid will fail.
Leave this blank or use 0 if you don't want a minimum. If this is your intention though, it should be included as a normal reaction and not a secondary reaction.
\nRemember to type any custom emojis as **<emojiname>**.
\nAll available emojis you can use are listed below.`)
        .addField("Examples", `\`<losthallskey>\` or \`<losthallskey> 1\``);

    embed = addClientEmojisToEmbed(clientEmojisList, embed);
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
            {name: `Secondary React ${pageInfo.currentSecondaryPos} of ${raidTemplate.secondaryNum}`, value: `${secondaryEmoji}`, inline: true},
            {name: "Minimum Reacts", value: `${raidTemplate.secondaryMins[pageInfo.currentSecondaryPos-1]}`, inline: true},
    )
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const displayReactsPage = (client, raidTemplate, clientEmojisList,  msg, pageInfo) => {
    const selectedList = raidTools.formatReactsListString(client, raidTemplate);

    let embed = tools.getStandardEmbed(client)
        .setTitle(`${raidTemplate.name} Reacts`)
        .setDescription(`Respond with any additional emojis (other than the primary and secondary reacts you just set) that you would like to be added to the message for raiders to react to.
These won't be used by the system, but you can use them to check the responses visually, depending on your use.
\nRemember to type any custom emojis as **<emojiname>**.
\nAll available emojis you can use are listed below.`)
        .addField("Example", `\`<warriorclass> <knightclass> <paladinclass> <ogmurability> <brainability>\``);

    embed = addClientEmojisToEmbed(clientEmojisList, embed);
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Reacts", value: `${selectedList}`}
    )
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const displayEndPage = (client, p, raidTemplate, msg, finished=false, pageInfo) => {
    const nameSplit = raidTemplate.name.split(" ");
    const commandDisplayName = nameSplit.length > 1 ? `"${raidTemplate.name}"` : `${raidTemplate.name}`;
    let templateDescription =  undefined;
    if (raidTemplate.description) {
        templateDescription = raidTools.formatRaidDescription(client, raidTemplate.description);
    }
    const primaryEmoji = raidTools.formatPrimaryEmoji(client, raidTemplate);
    const secondaryEmojis = raidTools.formatSecondaryEmojis(client, raidTemplate);
    const selectedList = raidTools.formatReactsListString(client, raidTemplate);

    let embed = tools.getStandardEmbed(client);
    if (!finished) {
        let descriptionPiece = undefined;
        let completable = !leftUndefined(raidTemplate);
        if (completable) {
            descriptionPiece = `If these are correct, react with ➡ to finalize this raid template.`;
        } else {
            descriptionPiece = `\n**One or more fields are still undefined! You cannot finish this setup until you have filled in all fields (except reacts).**`
        }
        embed = embed.setTitle(`${raidTemplate.name} Template ${completable ? `Completed` : `Unfinished`}`)
            .setDescription(`Your raid template settings are listed below.
${descriptionPiece}
\nTo change a setting, simply go back to the page by reacting with ⬅.
\nAfter finalizing this template, you can use it to start a raid by using:
\`${p}raid start ${commandDisplayName}\`.`);
    } else {
        embed = embed.setTitle(`Raid Templates Updated`)
        .setDescription(`You can use this template with \`${p}raid start ${commandDisplayName}\`.`);
    }
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Name", value: `${raidTemplate.name}`},
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Description", value: `${templateDescription}`},
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Primary React", value: `${primaryEmoji}`, inline: true},
        {name: "Minimum Primary Reacts", value: `${raidTemplate.primaryMin}`, inline: true},
    );
    
    if (raidTemplate.secondaryNum > 0) {
        embed = embed.addField("---------------------------------------------------------------------------------------------------------------------------------Required Secondary Reacts-----------------------------------",
`-----------------------------------------------------------------------------------------------`);
        for (let i=0; i<raidTemplate.secondaryNum; i++) {
            embed = embed.addField(`${secondaryEmojis[i]}`, `${raidTemplate.secondaryMins[i]}`, true);
        }
    }
    
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
        {name: "Reacts", value: `${selectedList}`},
        )
        .setFooter(`Iris Bot | Page ${pageInfo.pagePosition} of ${pageInfo.pagesLength}`, client.user.avatarURL());
    msg.edit(embed);
}

const updateCurrentPage = (client, p, type, raidTemplate, guildConfig, pageInfo, clientEmojisList, msg, res) => {
    switch (pageInfo.pageName) {
        case "start":
            displayStartPage(client, raidTemplate, type, msg, pageInfo);
            break;

        case "name":
            let exists = false;
            if (res) {
                const arg = tools.getArgs(res)[0];
                exists = tools.raidTemplateExists(arg, guildConfig);
                if (!exists) {
                    raidTemplate.name = arg;
                }
            }
            displayNamePage(client, p, raidTemplate, guildConfig, msg, exists, res, pageInfo);
            break;

        case "description":
            if (res) {
                raidTemplate.description = res;
            }
            displayDescriptionPage(client, raidTemplate, clientEmojisList, msg, pageInfo);
            break;

        case "primary":
            if (res) {
                const split = res.split(" ");
                if (tools.getEmoji(client, split[0])) {
                    raidTemplate.primaryEmoji = split[0];
                    if (split[1] && (split[1] != "")) {
                        const attemptedNum = parseInt(split[1].trim());
                        if (Number.isNaN(attemptedNum) || attemptedNum < 0) {
                            raidTemplate.primaryMin = 0;
                        } else {
                            raidTemplate.primaryMin = attemptedNum;
                        }
                    } else {
                        raidTemplate.primaryMin = 0;
                    }
                }
            }
            displayPrimaryEmojiPage(client, raidTemplate, clientEmojisList,  msg, pageInfo);
            break;

        case "secondarySetup":
            if (res) {
                const attemptedNum = parseInt(res.split(" ")[0].trim());
                if (Number.isNaN(attemptedNum) || attemptedNum < 0){
                    raidTemplate.secondaryNum = 0;
                    if (attemptedNum < raidTemplate.secondaryNum) {
                        raidTemplate.secondaryEmojis = raidTemplate.secondaryEmojis.slice(0, attemptedNum);
                        raidTemplate.secondaryMins = raidTemplate.secondaryMins.slice(0, attemptedNum);
                    }
                } else {
                    if (attemptedNum < raidTemplate.secondaryNum) {
                        raidTemplate.secondaryEmojis = raidTemplate.secondaryEmojis.slice(0, attemptedNum);
                        raidTemplate.secondaryMins = raidTemplate.secondaryMins.slice(0, attemptedNum);
                    }
                    raidTemplate.secondaryNum = attemptedNum;
                }
                pageInfo.secondaryNum = raidTemplate.secondaryNum;
                pageInfo.pagesLength = pageInfo.pages.length + pageInfo.secondaryNum;
            }
            displaySecondarySetupPage(client, raidTemplate, msg, pageInfo);
            break;

        case "secondary":
            if (res) {
                const split = res.split(" ");
                // checks that it's a valid emoji
                if (tools.getEmoji(client, split[0])) {
                    // check that the emoji doesn't exist in the list already and that it is not the primary emoji
                    if (!raidTemplate.secondaryEmojis.includes(split[0]) && (raidTemplate.primaryEmoji != split[0])) {
                        raidTemplate.secondaryEmojis[pageInfo.currentSecondaryPos-1] = split[0];
                        if (split[1] && (split[1] != "")) {
                            const attemptedNum = parseInt(split[1].trim());
                            if (Number.isNaN(attemptedNum) || attemptedNum < 0) {
                                raidTemplate.secondaryMins[pageInfo.currentSecondaryPos-1] = 0;
                            } else {
                                raidTemplate.secondaryMins[pageInfo.currentSecondaryPos-1] = attemptedNum;
                            }
                            
                        } else {
                            raidTemplate.secondaryMins[pageInfo.currentSecondaryPos-1] = 0;
                        }
                    }
                }
            }
            displaySecondaryEmojiPage(client, raidTemplate, clientEmojisList,  msg, pageInfo);
            break;

        case "reacts":
            if (res) {
                const split = res.split(" ");
                let emojis = [];
                for (emoji of split) {
                    const partTrim = emoji.trim();
                    if (tools.getEmoji(client, partTrim)) {
                        if (partTrim.startsWith("<") && partTrim.endsWith(">")) {
                            emojis.push(partTrim);
                        } else if (partTrim.startsWith("<") && (partTrim.charAt(partTrim.length-2) === ">")) {
                            // handles punctuation after emoji ending
                            emojis.push(partTrim.substring(0, partTrim.length-1));
                        } else {
                            emojis.push(emoji);
                        }
                    }
                }
                raidTemplate.reacts = emojis;
            }
            displayReactsPage(client, raidTemplate, clientEmojisList, msg, pageInfo);
            break;

        case "end":
            displayEndPage(client, p, raidTemplate, msg, false, pageInfo);
            break;
    }

    return raidTemplate;
}

const updateTemplateDatabase = async (raidTemplate, guildConfig, newTemplate, msg, db) => {
    const guildDoc = db.collection("guilds").doc(msg.guild.id);
    const templateDoc = guildDoc.collection("raidTemplates").doc(`${raidTemplate.name}`);

    let promises = [];
    promises.push(templateDoc.set({
        "name": raidTemplate.name,
        "description": raidTemplate.description,
        "primaryEmoji": raidTemplate.primaryEmoji,
        "primaryMin": raidTemplate.primaryMin,
        "secondaryNum": raidTemplate.secondaryNum,
        "secondaryEmojis": raidTemplate.secondaryEmojis,
        "secondaryMins": raidTemplate.secondaryMins,
        "reacts": raidTemplate.reacts,
    }));

    if (newTemplate) {
        let newRaidNames = guildConfig.raidTemplateNames.slice();
        newRaidNames.push(raidTemplate.name);
    
        promises.push(guildDoc.update({
            "raidTemplateNames": newRaidNames,
        }));
    }

    return Promise.all(promises);
}

const updatePagesList = (newTemplate, secondaryNum) => {
    let pages = ["start"];
    if (newTemplate) {
        pages.push("name");
    }
    pages.push("description");
    pages.push("primary");
    pages.push("secondarySetup");
    if (secondaryNum > 0) {
        pages.push("secondary");
    }
    pages.push("reacts");
    pages.push("end");
    return pages;
}

const getTemplateData = async (client, msg, p, guildConfig, db, newTemplate) => {
    let raidTemplate = null;
    const templateName = tools.getArgs(msg.content, p, 2)[0];
    if (!newTemplate) {
        raidTemplate = await tools.getRaidTemplate(templateName, guildConfig, db, client, msg);
    } else {
        raidTemplate = {
            name: templateName,
            description: undefined,
            primaryEmoji: undefined,
            primaryMin: 0,
            secondaryNum: 0,
            secondaryEmojis: [],
            secondaryMins: [],
            reacts: [],
        }
    }
    return raidTemplate;
}

const processCollection = (client, msg, p, collector, reaction, type, newTemplate, raidTemplate, guildConfig, pageInfo, clientEmojisList, m, db) => {
    pageInfo.pages = updatePagesList(newTemplate, raidTemplate.secondaryNum);
    pageInfo.pagesLength = pageInfo.pages.length + pageInfo.secondaryNum;
    if (reaction.emoji.name === "❌") {
        // cancel
        displayCancelledPage(client, m);
        collector.stop();
    } else if (reaction.emoji.name === "⬅") {
        collector.resetTimer();
        // go back page
        if (pageInfo.currentPage > 0) {
            if (pageInfo.pageName === "secondary") {
                if (pageInfo.currentSecondaryPos > 1) {
                    pageInfo.currentSecondaryPos = pageInfo.currentSecondaryPos - 1;
                } else {
                    pageInfo.currentPage = pageInfo.currentPage - 1;
                }
                pageInfo.pagePosition = pageInfo.pagePosition - 1;
                pageInfo.pageName = pageInfo.pages[pageInfo.currentPage];
            } else {
                pageInfo.currentPage = pageInfo.currentPage - 1;
                pageInfo.pagePosition = pageInfo.pagePosition - 1;
                pageInfo.pageName = pageInfo.pages[pageInfo.currentPage];
            }
            updateCurrentPage(client, p, type, raidTemplate, guildConfig, pageInfo, clientEmojisList, m);
        }
    } else if (reaction.emoji.name === "➡") {
        collector.resetTimer();
        // go forward page
        if (pageInfo.currentPage < pageInfo.pages.length-1) {
            if (pageInfo.pageName === "secondary") {
                if (pageInfo.currentSecondaryPos < raidTemplate.secondaryNum) {
                    pageInfo.currentSecondaryPos = pageInfo.currentSecondaryPos + 1;
                } else {
                    pageInfo.currentPage = pageInfo.currentPage + 1;
                }
                pageInfo.pagePosition = pageInfo.pagePosition + 1;
                pageInfo.pageName = pageInfo.pages[pageInfo.currentPage];
            } else {
                pageInfo.currentPage = pageInfo.currentPage + 1;
                pageInfo.pagePosition = pageInfo.pagePosition +  1;
                pageInfo.pageName = pageInfo.pages[pageInfo.currentPage];
            }
            updateCurrentPage(client, p, type, raidTemplate, guildConfig, pageInfo, clientEmojisList, m);
        } else {
            // finish
            if (!leftUndefined(raidTemplate)) {
                updateTemplateDatabase(raidTemplate, guildConfig, newTemplate, msg, db);
                displayEndPage(client, p, raidTemplate, m, true, pageInfo);
                collector.stop();
            }
        }
    }
}

module.exports.editRaidTemplate = async (client, msg, p, guildConfig, db, newTemplate = false) => {
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    if (!tools.hasPermission(guildMember, guildConfig)) {
        return false
    }

    let raidTemplate = await getTemplateData(client, msg, p, guildConfig, db, newTemplate);

    const clientEmojisList = tools.createClientEmojisList(client);
    let type = newTemplate ? "Create" : "Edit";
    let pages = updatePagesList(newTemplate, raidTemplate.secondaryNum);
    let pageInfo = {
        pages: pages,
        secondaryNum: 0,
        currentPage: 0,
        currentSecondaryPos: 1,
        pagePosition: 1,
        pagesLength: pages.length,
        pageName: pages[0],
    }

    const embed = displayStartPage(client, raidTemplate, type, msg, pageInfo, true);

    const reactionsList = ["⬅", "➡", "❌"];
    const reactionFilter = (reaction, user) => ((user.id === msg.author.id) && (reactionsList.includes(reaction.emoji.name)));

    msg.channel.send(embed).then(m => {

        // used to get user responses and update
        const messageListener =  res => {
            if (((res.channel === msg.channel) && (res.author.id === msg.author.id))) {
                // update info
                raidTemplate = updateCurrentPage(client, p, type, raidTemplate, guildConfig, pageInfo, clientEmojisList, m, res.content);
                res.delete();
            }
        };
        client.on("message", messageListener);

        const collector = m.createReactionCollector(reactionFilter, {time: 300000});
        collector.on("collect", reaction => {
            processCollection(client, msg, p, collector, reaction, type, newTemplate, raidTemplate, guildConfig, pageInfo, clientEmojisList, m, db);
        });

        collector.on("end", collected => {
            m.reactions.removeAll().catch(console.error);
            client.removeListener("message", messageListener);
        });

        // add initial reactions
        for (reaction of reactionsList) {
            m.react(reaction);
        }

    }).catch(console.error);

}