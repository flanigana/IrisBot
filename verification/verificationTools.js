const tools = require("../tools");

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

module.exports.updateServerVerification = async (msg, user, template, db) => {
    const guildId = msg.guild.id;
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

module.exports.sendUserNotInGuild = (client, msg, template, realmEyeData) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Verification Failure")
        .setDescription(`**${realmEyeData.name}** is not a member of **${template.guildName}**.
Because of this, you were not verified in **${msg.guild}**:${template.verificationChannel}.
\nIf this is not your username, reply with \`!updateIGN\` to start the process of re-verifying your current IGN.`);
    msg.author.send(embed);
};

module.exports.sendUserVerificationSuccess = (client, msg, user, template, manual) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${manual ? `Manually ` : ""}Verified!`)
        .setDescription(`Congratulations! You have been ${manual ? `manually ` : "successfully "}verified in 
**${msg.guild}**:${template.verificationChannel}.`);
    user.send(embed);
};

module.exports.sendGuildVerificationSuccess = async (client, template, guildMember, realmEyeData, manual, verifier) => {
    const roles = [];
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

module.exports.sendGuildVerificationReqFailure = async (client, p, template, guildMember, realmEyeData) => {
    const roles = [];
    guildMember.roles.cache.map(role => roles.push(role));
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${guildMember.displayName} Failed to Meet Verification Requirements!`)
        .setURL(`https://www.realmeye.com/player/${realmEyeData.name}`)
        .setDescription(`**${guildMember}** failed to meet requirements for **${template.name}** in ${template.verificationChannel}.
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

isMelee = className => {
    if (className.toLowerCase() === "knight") {return true;}
    if (className.toLowerCase() === "warrior") {return true;}
    if (className.toLowerCase() === "paladin") {return true;}
    return false;
};

module.exports.meetsReqs = (client, template, realmEyeData, msg) => {
    let pass = true;
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${realmEyeData.name} Does Not Meet Verification Requirements`)
        .setDescription(`Below are the reasons you do not meet the requirements for
**${msg.guild}**:${msg.channel}.`);
    if (realmEyeData.fame < template.fame) {
        pass = false;
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Fame", value: realmEyeData.fame, inline: true},
            {name: "Required Fame", value: template.fame, inline: true},
        );
    }
    if (realmEyeData.rank < template.rank) {
        pass = false;
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
    for (let character of realmEyeData.characters) {
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
        pass = false;
        characterPass = false;
    }
    sixEights -= template.eightEight;
    sixEights = sixEights < 0 ? 0 : sixEights;
    if (sixEights < template.sixEight) {
        pass = false;
        characterPass = false;
    }

    if (eightEightMelees < template.eightEightMelee) {
        pass = false;
        meleePass = false;
    }
    sixEightMelees -= template.eightEightMelee;
    sixEightMelees = sixEightMelees < 0 ? 0 : sixEightMelees;
    if (sixEightMelees < template.sixEightMelee) {
        pass = false;
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
        pass = false;
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Your Location", value: realmEyeData.lastSeen, inline: true},
            {name: "Hidden Location Required", value: `You must set your "Who can see my last known location?" setting to private on RealmEye.`, inline: true},
        );
        msg.author.send(embed);
    }

    if (!pass) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Seem Like An Error?", value: "You may need to re-log all of your characters as RealmEye will stop tracking characters it has not seen after a period of time."},
            {name: `${realmEyeData.name} No Longer Your IGN?`, value: "If this is the wrong IGN, reply with \`!updateIGN\` to re-verify your IGN with the bot."},
        );
        msg.author.send(embed);
    }


    // SIMPLE VERSION THAT MOSTLY WORKS REQUIRES SPECIFIC SERVER SETTINGS TO OPERATE PROPERLY
    // if (sixEights < template.sixEight) {return false;}
    // if (eightEights < template.eightEight) {return false;}
    // if (sixEightMelees < template.sixEightMelee) {return false;}
    // if (eightEightMelees < template.eightEightMelee) {return false;}
    return pass;
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
            for (let role of rolesNotSet) {
                outrankMsg += `${role} `;
            }
        }
        template.logChannel.send(outrankMsg);
    }

    Promise.all(promises).then(() => {
        return true;
    }).catch(console.error);
};