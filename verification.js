const admin = require("firebase-admin");
const tools = require("./tools");
const renders = require("./renders");

const sendVerificationMessage = (client, msg, veriCode) => {
    const embeded = tools.getStandardEmbeded(client)
        .setTitle("Verification Started")
        .setDescription(`Thank you for beginning your verification process with ${msg.guild.name}! Follow the steps below to complete your verification.`)
        .addFields(
            {name: "Step 1", value: `Login to your RealmEye account and put **${veriCode}** in any part of your description.`},
            {name: "Step 2", value: `Come back here and reply with \`!verify <ign>.\``},
            {name: "Step 3", value: `Once completed successfully, you'll receive a message verifying completion!`},
        )
    msg.author.send(embeded);
    return true;
}

const makeNewVeriCode = async (userDoc, guildId, guildName) => {
    const veriCode = `${guildName}_${Math.floor(Math.random() * Math.floor(1000000000000))}`;
    return userDoc.update({
        [`${guildId}`]: veriCode,
    }).then(() => {
        return veriCode;
    }).catch(console.error);
}

module.exports.beginVerification = async (client, msg, db) => {
    let guildConfig = null;
    let veriCode = null;
    return db.collection("guilds").doc(msg.guild.id).get().then(snapshot => {
        guildConfig = snapshot.data();
        if (!guildConfig.globalVerification && msg.channel != guildConfig.verificationChannel) {
            return false;
        }

        let guildName = null;
        if (!guildConfig.realmGuildName) {
            guildName = "Iris";
        } else {
            guildName = guildConfig.realmGuildName;
        }
        let guildId = msg.guild.id;

        const userDoc = db.collection("users").doc(msg.author.id);
        return userDoc.get().then(currentUser => {
            if (currentUser.exists) {
                const userData = currentUser.data();
                
                // user has begun verification for the server
                if (userData[`${guildId}`]) {
                    // user is already verified
                    if (userData[`${guildId}`] === "verified") {
                        const embeded = tools.getStandardEmbeded(client)
                            .setTitle("Already Verified!")
                            .setDescription(`You have already been verified in **${msg.guild.name}**!`);
                        msg.author.send(embeded);
                        return false;
                    // user is not already verified, re-use code
                    } else {
                        veriCode = userData[`${guildId}`];
                    }
                    return true;

                } else {
                    return makeNewVeriCode(userDoc, guildId, guildName).then(code => {
                        veriCode = code;
                        return true;
                    }).catch(console.error);
                }

            } else {
                return makeNewVeriCode(userDoc, guildId, guildName).then(code => {
                    veriCode = code;
                    return true;
                }).catch(console.error);
            }
        }).catch(console.error);

    }).then(beginVerify => {
        if (beginVerify) {
            return sendVerificationMessage(client, msg, veriCode);
        } else {
            return true;
        }
    }).catch(console.error);
}

const isMelee = className => {
    if (className.toLowerCase() === "knight") {return true}
    if (className.toLowerCase() === "warrior") {return true}
    if (className.toLowerCase() === "paladin") {return true}
    return false;
}

const meetsReqs = (guildConfig, realmEye) => {
    if (realmEye.fame < guildConfig.fameReq) {return false;}
    if (realmEye.rank < guildConfig.rankReq) {return false;}
    let sixEights = 0;
    let eightEights = 0;
    let sixEightMelees = 0;
    let eightEightMelees = 0;
    for (character of realmEye.characters) {
        if ((character.stats === "6/8") || (character.stats === "7/8")) {
            sixEights++;
            if (isMelee(character.class)) {
                sixEightMelees++;
            }
        } else if ((character.stats === "8/8")) {
            eightEights++;
            if (isMelee(character.class)) {
                eightEightMelees++;
            }
        }
    }
    if (sixEights < guildConfig.sixEightReq) {return false;}
    if (eightEights < guildConfig.eightEightReq) {return false;}
    if (sixEightMelees < guildConfig.sixEightMeleeReq) {return false;}
    if (eightEightMelees < guildConfig.eightEightMeleeReq) {return false;}
    return true;
}

const updateVerification = async (userId, guildId, guildConfig, ign, db) => {
    const userDoc = db.collection("users").doc(userId);

    return userDoc.update({
        "ign": ign,
        [`${guildId}`]: "verified",
    }).then(() => {
        const verifiedUsers = guildConfig.verifiedUsers;

        if (!verifiedUsers.includes(userId)) {
            verifiedUsers.push(userId);
            return db.collection("guilds").doc(guildId).update({
                "verifiedUsers": verifiedUsers,
            }).then(() => {
                return true;
            }).catch(console.error);

        } else {
            return true;
        }

    }).catch(console.error);
}

const getRankRole = (realmEye, guildConfig) => {
    let roleId = undefined;
    if (tools.checkRolesConfigured(guildConfig)) {
        switch (realmEye.guildRank.toLowerCase()) {
            case "founder":
                roleId = guildConfig.founderRole;
                break;
            case "leader":
                roleId = guildConfig.leaderRole;
                break;
            case "officer":
                roleId = guildConfig.officerRole;
                break;
            case "member":
                roleId = guildConfig.memberRole;
                break;
            case "initiate":
                roleId = guildConfig.initiateRole;
                break;
        }
    }
    return roleId;
}

const sendUserVerificationFailure = (client, user, guild, guildConfig) => {
    let embeded = tools.getStandardEmbeded(client)
        .setTitle("Verification Failure")
    if (!guildConfig.realmGuildName) {
        embeded.setDescription(`Sorry! **${guild.name}** hasn't set up their guild name in the bot configuration and does not allow non-guild-members to verify.Try contacting a server admin to have them finish configuration and then try verfying again.`);
    } else {
        embeded.setDescription(`Sorry! You are not a guild member of **${guildConfig.realmGuildName}** on RealmEye and this server does not allow for vefication of non-members.`);
    }
    user.send(embeded);
}

const sendUserVerificationSuccess = (client, user, guild) => {
    const embeded = tools.getStandardEmbeded(client)
    .setTitle("Verification Success")
    .setDescription(`Congratulations! You have been successfully verified with **${guild.name}**.`);
    user.send(embeded);
}

const sendGuildVerificationSuccess = async (client, logChannel, guildMember, ign, items) => {
    const roles = [];
    guildMember.roles.cache.map(role => roles.push(role));
    const embeded = tools.getStandardEmbeded(client)
    .setTitle("A New User Has Been Verified!")
    .setURL(`https://www.realmeye.com/player/${ign}`)
    .setDescription(`**${guildMember}** has just verified with the server as ${ign}!`)
    .addFields(
        {name: "Server Name", value: `${guildMember.displayName}`, inline: true},
        {name: "Discord Tag", value: `${guildMember.user.tag}`, inline: true},
        {name: "Discord Id", value: guildMember.id, inline: true},
        {name: "Roles", value: `${roles}`},
    )
    logChannel.send(embeded);

    buffer = renders.characterListVisualization(realmEyeData, items)
    const attachment = new Discord.MessageAttachment(buffer, "characterList.png");
    logChannel.send("Here is their RealmEye info:", attachment);
    return true;
}

const assignGuildRoles = async (realmEye, guild, guildConfig, guildMember) => {
    if (guildConfig.assignRoles) {
        const rankRoleId = getRankRole(realmEye, guildConfig);
        if (rankRoleId) {
            const rankRole = tools.getRoleById(guild, rankRoleId);
            if (!rankRole) {return false;}
            return guildMember.roles.add(rankRole);
        }
    }
}

const assignAllMemberRole = async (guild, guildConfig, guildMember) => {
    if (guildConfig.assignAllMember) {
        if (guildConfig.allMemberRole) {
            const allMemberRole = tools.getRoleById(guild, guildConfig.allMemberRole);
            if (!allMemberRole) {return false;}
            return guildMember.roles.add(allMemberRole);
        }
    }
}

const assignNonMemberRole = async (guild, guildConfig, guildMember) => {
    const role = tools.getRoleById(guild, guildConfig.nonMemberRole);
    if (!role) {return false;}
    return guildMember.roles.add(role.id);
}

const assignRoles = async (client, msg, guild, guildConfig, realmEye, db, items) => {
    const guildMember = guild.members.cache.find(user => user.id === msg.author.id);
    const verificationLogChannel = tools.getChannelById(guild, guildConfig.verificationLogChannel);
    if (!verificationLogChannel) {return false}
    
    let promises = [];
    if (!guildMember.manageable) {
        verificationLogChannel.send(`${guildMember} outranks IrisBot so no roles were assigned and server nickname was not changed to ign!`);
        // remove pending verification
        promises.push(updateVerification(msg.author.id, guild.id, guildConfig, realmEye.name, db));
    } else {
        if (guildConfig.realmGuildName && (realmEye.guild.toLowerCase() === guildConfig.realmGuildName.toLowerCase())) {
            // assign role based on guild rank
            promises.push(assignGuildRoles(realmEye, guild, guildConfig, guildMember));
            // check for role to assign to all members
            promises.push(assignAllMemberRole(guild, guildConfig, guildMember));
    
        // if player is not in guild, check if they can still verify
        } else if (guildConfig.assignNonMember) {
            promises.push(assignNonMemberRole(guild, guildConfig, guildMember));
    
        } else {
            sendUserVerificationFailure(client, msg.author, guild, guildConfig);
            return false;
        }
        // remove pending verification
        promises.push(updateVerification(msg.author.id, guild.id, guildConfig, realmEye.name, db).then(() => {
            return guildMember.setNickname(realmEye.name);
        }).catch(console.error));
    }

    sendUserVerificationSuccess(client, msg.author, guild);
    Promise.all(promises).then(() => {
        return sendGuildVerificationSuccess(client, verificationLogChannel, guildMember, realmEye.name, items);
    }).catch(console.error);
}

module.exports.checkForVerification = async (msg, client, db, items) => {
    if (msg.content.split(" ").length <= 1) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Error")
            .setDescription(`You need to include your ign in the command. Try: \`!verify <ign>\``);
        msg.author.send(embeded);
        return false;
    }

    const userDoc = db.collection("users").doc(msg.author.id);
    return userDoc.get().then(snapshot => {
        if (!snapshot.exists) {
            const embeded = tools.getStandardEmbeded(client)
                .setTitle("Error")
                .setDescription(`Sorry. It doesn't look like you started the verification process with any server. First go to a server's verification channel with this bot and type !verify to get a code to verify with that server.`);
            msg.author.send(embeded);
            return false;
        }

        const userData = snapshot.data();
        const userProps = Object.keys(userData);
        const ign = msg.content.split(" ")[1];

        return tools.getRealmEyeInfo(ign).then(realmEye => {

            for (prop of userProps) {
                if (!prop || prop === "ign" || (userData[prop] === "verified")) {
                    continue;
                }
                const guildId = prop;
                const veriCode = userData[guildId];

                // if user's RealmEye description has the correct verificiation code
                if (realmEye.description.includes(veriCode)) {
                    const guild = tools.getGuildById(client, guildId);

                    return db.collection("guilds").doc(guildId).get().then(snapshot => {
                        if (!snapshot.exists) {
                            const embeded = tools.getStandardEmbeded(client)
                                .setTitle("Error")
                                .setDescription(`There doesn't seem to be any data for ${guild.name}.`);
                            msg.author.send(embeded);
                            return false;
                        }
                        const guildConfig = snapshot.data();

                        if (meetsReqs(guildConfig, realmEye)) {
                            return assignRoles(client, msg, guild, guildConfig, realmEye, db, items);
                        } else {
                            const embeded = tools.getStandardEmbeded(client)
                                .setTitle("You Do Not Meet Verification Requirements")
                                .setDescription(`Sorry. You don't meet the verification requirements to join ${guild.name}. They are listed below.`)
                                .addFields(
                                    {name: "Fame", value: `${guildConfig.fameReq}`, inline: true},
                                    {name: "6/8s", value: `${guildConfig.sixEightReq}`, inline: true},
                                    {name: "8/8s", value: `${guildConfig.eightEightReq}`, inline: true},
                                    {name: "Rank", value: `${guildConfig.rankReq}`, inline: true},
                                    {name: "6/8 Melees", value: `${guildConfig.sixEightMeleeReq}`, inline: true},
                                    {name: "8/8 Melees", value: `${guildConfig.eightEightMeleeReq}`, inline: true},
                                );
                            msg.author.send(embeded);
                            return false;
                        }
                    }).catch(console.error);
                }
            }
            const embeded = tools.getStandardEmbeded(client)
                .setTitle("Error")
                .setDescription(`Sorry. there was trouble finding a valid verification code in your RealmEye description... Please try again.`);
            msg.author.send(embeded);
            return false;
        }).catch(console.error);
    }).catch(console.error);
}