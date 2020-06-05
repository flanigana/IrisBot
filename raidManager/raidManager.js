const tools = require("../tools");
const raidConfig = require("./raidConfig");
const raidTools = require("./raidTools");
const raidStart = require("./raidStart");
const raidEdit = require("./raidEdit");
const raidShorthand = require("./raidShorthand");

const deleteTemplate = (templateName, guildConfig, db) => {
    let promises = [];
    const guildDoc = db.collection("guilds").doc(`${guildConfig.guildId}`);
    promises.push(guildDoc.collection("raidTemplates").doc(`${templateName}`).delete());

    let updatedNames = [];
    for (raidName of guildConfig.raidTemplateNames) {
        if (raidName != templateName) {
            updatedNames.push(raidName);
        }
    }
    promises.push(guildDoc.update({
        "raidTemplateNames": updatedNames,
    }));

    return Promise.all(promises);
}

const confirmTemplateDeleted = (client, templateName, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${templateName} Raid Template Was Deleted`);
    msg.edit(embed);
}

const cancelDeleteTemplate = (client, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Template Delete Cancelled");
    msg.edit(embed);
}

const templateNotFound = (client, templateName, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${templateName} Not Found`)
    msg.channel.send(embed);
}

module.exports.deleteRaidTemplate = async (client, p, msg, guildConfig, db) => {
    const templateName = tools.getArgs(msg.content, p, 2)[0];
    const templateExists = tools.raidTemplateExists(templateName, guildConfig);
    if (!templateExists) {
        templateNotFound(client, templateName, msg);
        return false;
    }

    const embed = tools.getStandardEmbed(client)
        .setTitle("Template Delete Confirmation")
        .setDescription(`Are you sure you would like to delete the ${templateName} template?
Reply with **yes** or **no**.`)
    return msg.channel.send(embed).then(m => {
        const messageListener =  res => {
            if (((res.channel === msg.channel) && (res.author.id === msg.author.id))) {
                client.removeListener("message", messageListener);
                res.delete();
                switch (res.content) {
                    case "y":
                    case "yes":
                        return deleteTemplate(templateName, guildConfig, db).then(() => {
                            return confirmTemplateDeleted(client, templateName, m);
                        }).catch(console.error);
                }
                return cancelDeleteTemplate(client, m);
            }
        };
        client.on("message", messageListener);
    }).catch(console.error);
}

const listRaidTemplates = async (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 2);

    if (args.length === 0) {
        let embed = tools.getStandardEmbed(client)
            .setTitle("Existing Raid Templates")
            .setDescription(`To view details of a specific raid template, use:
\`${p}raid list <templateName>\`.`)
        const templateNames = guildConfig.raidTemplateNames;
        let nameList = ``;
        for (template of templateNames) {
            nameList += nameList === "" ? `${template}` : ` | ${template}`;
        }
        nameList = nameList === "" ? "No raid templates" : nameList;
        embed = embed.addField("Existing Templates", `${nameList}`);
        msg.channel.send(embed);

    } else {
        let templateName = args[0];
        for (name of guildConfig.raidTemplateNames) {
            if (templateName.toLowerCase() === name.toLowerCase()) {
                templateName = name;
            }
        }

        return db.collection("guilds").doc(`${guildConfig.guildId}`).collection("raidTemplates").doc(`${templateName}`).get().then(snapshot => {
            if (!snapshot.exists) {
                return false;
            }
            const raidTemplate = snapshot.data();

            let templateDescription =  undefined;
            if (raidTemplate.description) {
                templateDescription = raidTools.formatRaidDescription(client, raidTemplate.description, msg.guild.id);
            }
            const primaryEmoji = raidTools.formatPrimaryEmoji(client, raidTemplate, msg.guild.id);
            const secondaryEmojis = raidTools.formatSecondaryEmojis(client, raidTemplate, msg.guild.id);
            const selectedList = raidTools.formatReactsListString(client, raidTemplate, msg.guild.id);
        
            let embed = tools.getStandardEmbed(client)
                .setTitle(`${raidTemplate.name} Raid Template`)
                .setDescription(`Your raid template settings are listed below.
You can use it to start a raid by using: \`${p}raid start ${raidTemplate.name}\`.
To edit this template, use: \`${p}raid edit ${raidTemplate.name}\`
To delete this template, use: \`${p}raid delete ${raidTemplate.name}\``);
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
                embed = embed.addField("-----------------------------------------------------------------------------------------------------------------------------------Secondary React Limits-------------------------------------",
                    `-----------------------------------------------------------------------------------------------`);
                for (let i=0; i<raidTemplate.secondaryNum; i++) {
                    embed = embed.addField(`${secondaryEmojis[i]}`, `${raidTemplate.secondaryLimits[i]}`, true);
                }
            }
            
            embed = embed.addFields(
                {name: "--------------------------------------------------------------------------------------------------",
                        value: `-----------------------------------------------------------------------------------------------`},
                {name: "Reacts", value: `${selectedList}`},
                );
            msg.channel.send(embed);
        }).catch(console.error);
    }
}

const raidEditHelp = (client, p, msg, guildConfig) => {
    let existingNames = ``;
    for (name of guildConfig.raidTemplateNames) {
        existingNames += existingNames === "" ? `${name}` : ` | ${name}`;
    }
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Raid Commands")
        .setDescription(`Edit an exiting raid template using:
\`\`\`${p}raid edit <templateName>\`\`\``)
        .addField("Existing Template Names", `${existingNames}`);
    msg.channel.send(embed);
}

const raidDeleteHelp = (client, p, msg, guildConfig) => {
    let existingNames = ``;
    for (name of guildConfig.raidTemplateNames) {
        existingNames += existingNames === "" ? `${name}` : ` | ${name}`;
    }
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Raid Commands")
        .setDescription(`Delete an exiting raid template using:
\`\`\`${p}raid delete <templateName>\`\`\``)
        .addField("Existing Template Names", `${existingNames}`);
    msg.channel.send(embed);
}

const raidStartHelp = (client, p, msg, guildConfig) => {
    let existingNames = ``;
    for (name of guildConfig.raidTemplateNames) {
        existingNames += existingNames === "" ? `${name}` : ` | ${name}`;
    }
    existingNames = existingNames === "" ? "No existing raid templates." : existingNames;
    let raidLeaderRoles = ``;
    for (role of guildConfig.raidLeaderRoles) {
        const actualRole = tools.getRoleById(msg.guild, role);
        raidLeaderRoles += raidLeaderRoles === "" ? `${actualRole}` : ` | ${actualRole}`;
    }
    raidLeaderRoles = raidLeaderRoles === "" ? "No raid leader roles." : raidLeaderRoles;
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Raid Commands")
        .setDescription(`A member with one of the raid leader roles can start a raid, using the following command:
\`\`\`!raid start <templateName> <idleVoiceChannel> <destVoiceChannel> <?alertTextChannel> <?runTime>\`\`\``)
        .addFields(
            {name: "Existing Template Names", value: `${existingNames}`},
            {name: "<templateName>", value: `The raid template you would like to use for the raid check.`},
            {name: "<idleVoiceChannel>", value: `The voice channel raiders must be in to be dragged into at the end of the check.`},
            {name: "<destVoiceChannel>", value: `The voice channel raiders will be dragged into at the end of the check.`},
            {name: "<?alertTextChannel> : optional", value: `The text channel that the raid status will be sent to.\nThe alert will be sent to the same channel as the command was sent in by default.`},
            {name: "<?runTime> : optional", value: `The number of seconds that you would like the raid check to last for.\nThe default setting is 2 minutes.`},
            {name: "Additional Info", value: `If you have a raid leader role:\nReact with ✅ to end the check early.\nReact with ❌ to cancel the check.`},
            {name: "Current Raid Leader Roles", value: `${raidLeaderRoles}`},
        )
    msg.channel.send(embed);
}

module.exports.raid = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args[0] != "start") {
        const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
        if (!tools.isAdmin(guildMember, guildConfig)) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Must be Server Admin to Access This Command");
            msg.channel.send(embed);
            return false;
        }
    }

    if ((args.length > 1) && ((args[0] != "create") && (args[0] != "shorthand") && (args[0] != "config")) && (!tools.raidTemplateExists(args[1], guildConfig))) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Template Does Not Exist")
            .setDescription(`There is no raid template named **${args[1]}** in this server.`)
        msg.channel.send(embed);
        return false;
    } else if ((args.length > 1) && (args[0] === "create") && (tools.raidTemplateExists(args[1], guildConfig))){
        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Template Already Exists")
            .setDescription(`There is already a raid template named **${args[1]}** in this server. If you would like to edit it, use:
\`\`\`${p}raid edit ${args[1]}\`\`\`
Otherwise, please enter a unique raid template name.`)
        msg.channel.send(embed);
        return false;
    }

    switch (args[0]) {
        case "config":
            return raidConfig.configRaid(client, p, msg, guildConfig, db);
        case "list":
            return listRaidTemplates(client, p, msg, guildConfig, db);
        case "create":
            return raidEdit.editRaidTemplate(client, p, msg, guildConfig, db, true);
        case "edit":
            if (args.length < 2) {
                return raidEditHelp(client, p, msg, guildConfig);
            } else {
                return raidEdit.editRaidTemplate(client, p, msg, guildConfig, db);
            }
        case "delete":
            if (args.length < 2) {
                return raidDeleteHelp(client, p, msg, guildConfig);
            } else {
                return this.deleteRaidTemplate(client, p, msg, guildConfig, db);
            }
        case "start":
            if (args.length < 2) {
                return raidStartHelp(client, p, msg, guildConfig);
            } else {
                return raidStart.startRaid(client, p, msg, guildConfig, db);
            }
        case "shorthand":
            return raidShorthand.shorthand(client, p, msg, guildConfig, db);
        default:
            const fullCommand = `${p}raid ${args[0]}`;
            msg.reply(`"${fullCommand}" is not a valid command!`);
            return false;
    }
}