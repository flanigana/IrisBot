const tools = require("../general/tools");

/////////////////////////////////////////////////////////////////////
//**                   General Functions                           */
/////////////////////////////////////////////////////////////////////

module.exports.getChannelTemplateName = (channelId, guildConfig) => {
    const templateList = guildConfig.verificationTemplateNames;
    for (let i=0; i<templateList.length; i++) {
        /**
         *  verification templates are stored in the database with the name and id to quickly check for the related verification channel
         *  this then looks like "templateName | channel.id" in the verificationTemplateNames variable in the db
        */
        const templatePair = templateList[i].split(" | ");
        const tempChannelId = templatePair[1].trim();
        if (tempChannelId === channelId) {
            return templatePair[0];
        }
    }
    return undefined;
};

module.exports.makeNewVeriCode = async (userDoc) => {
    const veriCode = `Iris_${Math.floor(Math.random() * Math.floor(1000000000000))}`;

    return userDoc.get().then(snapshot => {

        if (snapshot.exists) {
            return userDoc.update({
                [`veriCode`]: veriCode,
            }).then(() => {
                return veriCode;
            }).catch(console.error);

        } else {
            return userDoc.set({
                [`veriCode`]: veriCode,
            }).then(() => {
                return veriCode;
            }).catch(console.error);
        }
    });
};

module.exports.updateIgnVerification = async (userId, ign, db) => {
    const userDoc = db.collection("users").doc(userId);
    let promises = [];

    promises.push(userDoc.update({
        "ign": ign,
        "veriCode": null,
    }));

    Promise.all(promises).then(() => {
        return true;
    }).catch(console.error);
};

module.exports.updateServerVerification = async (guild, user, template, db) => {
    const guildId = guild.id;
    const userId = user.id;
    const userDoc = db.collection("users").doc(userId);

    let promises = [];

    promises.push(userDoc.update({
        [`${guildId} | ${template.name}`]: "verified",
    }));

    let verifiedUsers = template.verified;
    if (!verifiedUsers.includes(userId)) {
        verifiedUsers.push(userId);
    }
    
    promises.push(db.collection("guilds").doc(guildId).collection("verificationTemplates").doc(template.name).update({
        "verified": verifiedUsers,
    }));

    Promise.all(promises).then(() => {
        return true;
    }).catch(console.error);
};


/////////////////////////////////////////////////////////////////////
//**                     Message Sending                           */
/////////////////////////////////////////////////////////////////////

module.exports.sendIgnVerificationStartMessage = (client, msg, veriCode) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Verification Started")
        .setDescription(`Thank you for beginning your verification process with Iris Bot! Once this verification is complete, your IGN will be saved for future use.
\nFollow the steps below to complete your verification.`)
        .addFields(
            {name: "Step 1", value: `Login to your RealmEye account and put \`${veriCode}\` in any part of your description.`},
            {name: "Step 2", value: `Come back here and reply with \`!verify <ign>\`.`},
            {name: "Step 3", value: `Once completed successfully, you'll receive a message verifying completion!`},
        );
    msg.author.send(embed);
};

module.exports.sendIgnVerificationSuccessMessage = (client, msg, ign) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Verification Success")
        .setDescription(`Congratulations! You have been successfully verified as **${ign}**!
You can now verify in any verification channel using this bot by using the verify command in a valid channel.`)
        .addFields(
            {name: "Updating Your IGN", value: `If you ever need to update your IGN, just type \`!updateIGN\` in any channel used for verification by this bot or you can use the same command in a DM to Iris Bot.`},
        );
    msg.author.send(embed);
};

module.exports.sendUserNotInGuild = (client, user, guild, template, realmEyeData) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Verification Failure")
        .setDescription(`**${realmEyeData.name}** is not a member of **${template.guildName}**.
Because of this, you were not verified in **${guild}**:${template.verificationChannel}.
\nIf this is not your username, reply with \`!updateIGN\` to start the process of re-verifying your current IGN.`);
    user.send(embed);
};

module.exports.sendUserVerificationSuccess = (client, user, guild, template, manual) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${manual ? `Manually ` : ""}Verified!`)
        .setDescription(`Congratulations! You have been ${manual ? `manually ` : "successfully "}verified in 
**${guild}**:${template.verificationChannel}.`);
    user.send(embed);
};

module.exports.sendGuildVerificationSuccess = async (client, template, guildMember, realmEyeData, manual, verifier) => {
    let roles = [];
    guildMember.roles.cache.map(role => roles.push(role));

    const embed = tools.getStandardEmbed(client)
        .setTitle(`${guildMember.displayName} Has Been ${manual ? `Manually ` : ""}Verified!`)
        .setURL(`https://www.realmeye.com/player/${realmEyeData.name}`)
        .setDescription(`**${guildMember}** has just been  ${manual ? `manually ` : ""}verified in ${template.verificationChannel} as ${realmEyeData.name}${manual ? ` by ${verifier}` : ""}!`)
        .addFields(
            {name: "Server Name", value: `${guildMember.displayName}`, inline: true},
            {name: "Discord Tag", value: `${guildMember.user.tag}`, inline: true},
            {name: "Discord Id", value: guildMember.id, inline: true},
            {name: "Roles", value: `${roles}`},
        );
    template.logChannel.send(embed);
};

module.exports.sendGuildVerificationReqFailure = async (client, p, template, guildMember, realmEyeData, reqCheck) => {
    const roles = [];
    guildMember.roles.cache.map(role => roles.push(role));
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${guildMember.displayName} Failed to Meet Verification Requirements!`)
        .setURL(`https://www.realmeye.com/player/${realmEyeData.name}`)
        .setDescription(`**${guildMember}** failed to meet requirements for **${template.name}** in ${template.verificationChannel} for the following reasons:
**${reqCheck.reasons}**${reqCheck.dungeonsFailed != "" ? `\n\nUser Dungeon Counts:\n${reqCheck.dungeonsFailed}\n\nRequired Dungeon Counts:\n${reqCheck.dungeonsRequired}` : ""}
\nIf you would like to manually verify them, you can do so using the following command: \`\`\`${p}manualVerify ${guildMember.id} ${template.name}\`\`\``)
        .addFields(
            {name: "Server Name", value: `${guildMember.displayName}`, inline: true},
            {name: "Discord Tag", value: `${guildMember.user.tag}`, inline: true},
            {name: "Discord Id", value: guildMember.id, inline: true},
            {name: "Roles", value: `${roles}`},
        );
    template.logChannel.send(embed);
};

module.exports.sendGuildVerificationGuildFailure = async (client, p, template, guildMember, realmEyeData) => {
    const roles = [];
    guildMember.roles.cache.map(role => roles.push(role));
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${guildMember.displayName} is not a Member of ${template.guildName} but Meets Requirements!`)
        .setURL(`https://www.realmeye.com/player/${realmEyeData.name}`)
        .setDescription(`**${guildMember}** could not verify for **${template.name}** in ${template.verificationChannel} due to not being a member of **${template.guildName}**.
\nIf you would like to manually verify them, you can do so using the following command: \`\`\`${p}manualVerify ${guildMember.id} ${template.name}\`\`\``)
        .addFields(
            {name: "Server Name", value: `${guildMember.displayName}`, inline: true},
            {name: "Discord Tag", value: `${guildMember.user.tag}`, inline: true},
            {name: "Discord Id", value: guildMember.id, inline: true},
            {name: "Roles", value: `${roles}`},
        );
    template.logChannel.send(embed);
};


/////////////////////////////////////////////////////////////////////
//**                  Requirement Checking                         */
/////////////////////////////////////////////////////////////////////

const isMelee = className => {
    if (className.toLowerCase() === "knight") {return true;}
    if (className.toLowerCase() === "warrior") {return true;}
    if (className.toLowerCase() === "paladin") {return true;}
    return false;
};

const checkDungeonCounts = (template, realmEyeData) => {
    let dungeonCounts = {
        pass: true,
        failedCounts: "",
        requiredCounts: "",
    };

    const requiredDungeons = tools.getArgs(template.dungeons);

    for (let i=0; i < requiredDungeons.length; i+=3) {
        const dungeonName = requiredDungeons[i];
        const requiredCount = parseInt(requiredDungeons[i+1]);
        const userCount = realmEyeData.dungeons[dungeonName];

        if (userCount < requiredCount) {
            dungeonCounts.pass = false;
            dungeonCounts.failedCounts += dungeonCounts.failedCounts === "" ? `"${dungeonName}" ${userCount}` : ` | "${dungeonName}" ${userCount}`;
            dungeonCounts.requiredCounts += dungeonCounts.requiredCounts === "" ? `"${dungeonName}" ${requiredCount}` : ` | "${dungeonName}" ${requiredCount}`;
        }
    }

    return dungeonCounts;
};

module.exports.meetsReqs = (client, user, guild, verificationChannel, template, realmEyeData, notInGuild) => {
    let results = {
        pass: true,
        reasons: [],
        dungeonsFailed: "",
        dungeonsRequired: "",
    };
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${realmEyeData.name} Does Not Meet Verification Requirements`)
        .setDescription(`Below are the reasons you do not meet the requirements for
**${guild}**:${verificationChannel}.`);
    if (realmEyeData.fame < template.fame) {
        results.pass = false;
        results.reasons.push("fame");
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Fame", value: realmEyeData.fame, inline: true},
            {name: "Required Fame", value: template.fame, inline: true},
        );
    }
    if (realmEyeData.rank < template.rank) {
        results.pass = false;
        results.reasons.push("rank");
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Rank", value: realmEyeData.rank, inline: true},
            {name: "Required Rank", value: template.rank, inline: true},
        );
    }
    let sixEights = 0;
    let eightEights = 0;
    let sixEightMelees = 0;
    let eightEightMelees = 0;
    for (const character of realmEyeData.characters) {
        if ((character.stats === "6/8") || (character.stats === "7/8") || (character.stats === "8/8")) {
            sixEights++;
            if (isMelee(character.class)) {
                sixEightMelees++;
            }
        }

        if ((character.stats === "8/8")) {
            eightEights++;
            if (isMelee(character.class)) {
                eightEightMelees++;
            }
        }
    }

    let characterPass = true;
    let meleePass = true;

    /**
     * Version that correctly removes 8/8 characters as 6/8 characters if they have been counted as an 8/8 during checks
     * This allows for servers to require 2 6/8s and if a user has 2 8/8s, they will pass
     * If a server requires 2 6/8s AND 2 8/8s and a user has 4 8/8s, they will pass because 2 8/8s will be counted and 2 "6/8s" will be "left over"
     *  */
    if (eightEights < template.eightEight) {
        results.pass = false;
        results.reasons.push("8/8s");
        characterPass = false;
    }
    sixEights -= template.eightEight;
    sixEights = sixEights < 0 ? 0 : sixEights;
    if (sixEights < template.sixEight) {
        results.pass = false;
        results.reasons.push("6/8s");
        characterPass = false;
    }

    if (eightEightMelees < template.eightEightMelee) {
        results.pass = false;
        results.reasons.push("8/8 melees");
        meleePass = false;
    }
    sixEightMelees -= template.eightEightMelee;
    sixEightMelees = sixEightMelees < 0 ? 0 : sixEightMelees;
    if (sixEightMelees < template.sixEightMelee) {
        results.pass = false;
        results.reasons.push("6/8 melees");
        meleePass = false;
    }

    if (!characterPass) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Number of 6/8s", value: sixEights, inline: true},
            {name: "Required Number of 6/8s", value: template.sixEight, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Number of 8/8s", value: eightEights, inline: true},
            {name: "Required Number of 8/8s", value: template.eightEight, inline: true},
        );
    }

    if (!meleePass) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Number of 6/8 Melees", value: sixEightMelees, inline: true},
            {name: "Required Number of 6/8 Melees", value: template.sixEightMelee, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Number of 8/8 Melees", value: eightEightMelees, inline: true},
            {name: "Required Number of 8/8 Melees", value: template.eightEightMelee, inline: true},
        );
    }

    if (template.hidden && (realmEyeData.lastSeen != "hidden")) {
        results.pass = false;
        results.reasons.push("location");
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Location", value: realmEyeData.lastSeen, inline: true},
            {name: "Hidden Location Required", value: `You must set your "Who can see my last known location?" setting to private on RealmEye.`, inline: true},
        );
    }

    if (template.dungeons) {
        const dungeonCounts = checkDungeonCounts(template, realmEyeData);
        if (!dungeonCounts.pass) {
            results.pass = false;
            results.reasons.push("dungeons");
            results.dungeonsFailed = dungeonCounts.failedCounts;
            results.dungeonsRequired = dungeonCounts.requiredCounts;
            embed = embed.addFields(
                {name: "--------------------------------------------------------------------------------------------------",
                    value: `-----------------------------------------------------------------------------------------------`},
                {name: "Your Dungeon Counts", value: dungeonCounts.failedCounts},
                {name: "Required Dungeon Counts", value: dungeonCounts.requiredCounts},
            );
        }
    }

    if (!results.pass && !notInGuild) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Seem Like An Error?", value: "You may need to re-log all of your characters as RealmEye will stop tracking characters it has not seen after a period of time."},
            {name: `${realmEyeData.name} No Longer Your IGN?`, value: "If this is the wrong IGN, reply with \`!updateIGN\` to re-verify your IGN with the bot."},
        );
        user.send(embed);
    }
    
    return results;
};


/////////////////////////////////////////////////////////////////////
//**                        Role Tools                             */
/////////////////////////////////////////////////////////////////////

const getRankRole = (realmEyeData, template) => {
    let role;
    if (template.guildType) {
        switch (realmEyeData.guildRank.toLowerCase()) {
            case "founder":
                role = template.founderRole;
                break;
            case "leader":
                role = template.leaderRole;
                break;
            case "officer":
                role = template.officerRole;
                break;
            case "member":
                role = template.memberRole;
                break;
            case "initiate":
                role = template.initiateRole;
                break;
        }
    }
    return role;
};

module.exports.assignRoles = async (template, guildMember, realmEyeData) => {
    let promises = [];
    let rolesNotSet = [];

    // check if template is a guild type
    if (template.guildType) {
        if (template.guildRoles) {
            // assign role based on guild rank
            const rankRole = getRankRole(realmEyeData, template);
            if (rankRole) {
                if (guildMember.manageable) {
                    promises.push(guildMember.roles.add(rankRole));
                } else {
                    rolesNotSet.push(rankRole);
                }
            }
        }

        // check for role to assign to all members
        if (template.verifiedRole) {
            if (guildMember.manageable) {
                promises.push(guildMember.roles.add(template.verifiedRole));
            } else {
                rolesNotSet.push(template.verifiedRole);
            }
        }

    } else {
        // check for role to assign to all who verify
        if (template.verifiedRole) {
            if (guildMember.manageable) {
                promises.push(guildMember.roles.add(template.verifiedRole));
            } else {
                rolesNotSet.push(template.verifiedRole);
            }
        }
    }

    // sends message notifying server that roles were not set due user outranking bot
    if (!guildMember.manageable) {
        let outrankMsg = `${guildMember} outranks IrisBot so their server nickname was not set to their Realm IGN, **${realmEyeData.name}**`;
        if (rolesNotSet.length > 0) {
            outrankMsg += `, and the following roles were not assigned: `;
            for (const role of rolesNotSet) {
                outrankMsg += `${role} `;
            }
        }
        template.logChannel.send(outrankMsg);
    }

    return Promise.all(promises).then(() => {
        return true;
    }).catch(console.error);
};


/////////////////////////////////////////////////////////////////////
//**                      Template Tools                           */
/////////////////////////////////////////////////////////////////////

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

module.exports.getVerificationTemplate = async (client, guild, templateName, guildConfig, db, msg) => {
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
                template.verificationChannel = tools.getChannelById(guild, template.verificationChannel, "text");
            }
            if (template.logChannel) {
                template.logChannel = tools.getChannelById(guild, template.logChannel, "text");
            }
            if (template.guildRoles) {
                template.founderRole = tools.getRoleById(guild, template.founderRole);
                template.leaderRole = tools.getRoleById(guild, template.leaderRole);
                template.officerRole = tools.getRoleById(guild, template.officerRole);
                template.memberRole = tools.getRoleById(guild, template.memberRole);
                template.initiateRole = tools.getRoleById(guild, template.initiateRole);
            }
            if (template.verifiedRole) {
                template.verifiedRole = tools.getRoleById(guild, template.verifiedRole);
            }
            return template;
        } else {
            return undefined;
        }
    }).catch(console.error);
};