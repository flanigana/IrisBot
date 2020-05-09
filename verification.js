const tools = require("./tools");
const admin = require("firebase-admin");
const fieldValue = admin.firestore.fieldValue;

const sendVerificationMessage = (msg, veriCode) => {
    msg.author.send(`Thanks for beginning your verification process with ${msg.guild.name}! Follow the steps below to complete your verification.

        - Login to your RealmEye account and put ${veriCode} in any part of your description.
        - Then come back here and reply with \`!verify <ign>\`.
        - Once completed successfully, you'll receive a message verifying completion!`
    );
    return true;
}

module.exports.beginVerification = async (msg, db) => {
    let guildConfig = null;
    return db.collection("guilds").doc(msg.guild.id).get().then(snapshot => {
        guildConfig = snapshot.data();
        if (msg.channel != guildConfig.verificationChannel) {
            return false;
        }

        let guildName = null;
        if (!guildConfig.realmGuildName) {
            guildName = "Iris";
        } else {
            guildName = guildConfig.realmGuildName;
        }
        let veriCode = null;
        let guildId = msg.guild.id;
        let userId = msg.author.id;

        const userDoc = db.collection("users").doc(userId);
        return userDoc.get().then(currentUser => {
            if (currentUser.exists) {
                const userData = currentUser.data();
                
                if (userData[`${guildId}`]) {
                    veriCode = userData[`${guildId}`];
                    return sendVerificationMessage(msg, veriCode);

                } else {
                    veriCode = `${guildName}_${Math.floor(Math.random() * Math.floor(1000000000000))}`;
                    return userDoc.update({
                        [`${guildId}`]: veriCode,
                    }).then(() => {
                        return sendVerificationMessage(msg, veriCode);
                    }).catch(console.error);
                }

            } else {
                veriCode = `${guildName}_${Math.floor(Math.random() * Math.floor(1000000000000))}`;
                return userDoc.set({
                    [`${guildId}`]: veriCode,
                }).then(() => {
                    return sendVerificationMessage(msg, veriCode);
                }).catch(console.error);
            }
        }).catch(console.error);

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

const removePendingVerification = async (userId, guildId, db) => {
    const userDoc = db.collection("users").doc(userId);

    return userDoc.update({[`${guildId}`]: null}).then(() => {
        return userDoc.get().then(snapshot => {
            const userData = snapshot.data();
            const pendingGuilds = Object.keys(userData);
            let hasPending = false;
            for (guildId in pendingGuilds) {
                if (userData[guildId]) {
                    hasPending = true;
                    break;
                }
            }
            if (!hasPending) {
                return userDoc.delete().then(() => {return true;}).catch(console.error);
            }
        });
    });
}

const getRankRole = (realmEye, guildConfig) => {
    let roleId = null;
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

const assignGuildRoles = (realmEye, guild, guildConfig, guildMember) => {
    const verificationLogChannel = tools.getChannelById(guild, guildConfig.verificationLogChannel);
    if (!verificationLogChannel) {return false}
    if (guildConfig.assignRoles) {
        const roleId = getRankRole(realmEye, guildConfig);
        if (roleId) {
            const role = tools.getRoleById(guild, roleId);
            if (!role) {return false;}
            guildMember.roles.add(role.id);
            verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name} with role ${role}!`);
        } else {
            verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name}!`);
        }
        
    } else {
        verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name}!`);
    }
}

const assignRoles = async (realmEye, guild, guildConfig, msg, db) => {
    const guildMember = guild.members.cache.find(user => user.id === msg.author.id);
    if (guildConfig.realmGuildName && (realmEye.guild.toLowerCase() === guildConfig.realmGuildName.toLowerCase())) {
        // assign role based on guild rank
        assignGuildRoles(realmEye, guild, guildConfig, guildMember);
        // check for role to assign to all members
        if (guildConfig.assignAllMember) {
            if (guildConfig.allMemberRole) {
                const role = tools.getRoleById(guild, guildConfig.allMemberRole);
                if (!role) {return false;}
                if (msg.author.id !== guildConfig.guildOwner) {
                    guildMember.roles.add(role.id);
                }
            }
        }
        // remove pending verification
        return removePendingVerification(msg.author.id, guild.id, db).then(() => {
            return guildMember.setNickname(realmEye.name).then(() => {
                msg.reply(`You have successfully verified with ${guild.name}!`);
                return true;
            }).catch(console.error);
        }).catch(console.error);

    // if player is not in guild, check if they can still verify
    } else if (guildConfig.assignNonMember) {
        const role = tools.getRoleById(guild, guildConfig.nonMemberRole);
        if (!role) {return false;}
        if (msg.author.id !== guildConfig.guildOwner) {
            guildMember.roles.add(role.id);
        }
        const verificationLogChannel = tools.getChannelById(guild, guildConfig.verificationLogChannel);
        if (!verificationLogChannel) {return false;}
        verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name}!`);
        // remove pending verification
        return removePendingVerification(msg.author.id, guild.id, db).then(() => {
            if (msg.author.id === guildConfig.guildOwner) {
                return true;
            }
            return guildMember.setNickname(realmEye.name).then(() => {
                msg.reply(`You have successfully verified with ${guild.name}!`);
                return true;
            }).catch(console.error);
        }).catch(console.error);

    } else {
        if (!guildConfig.realmGuildName) {
            msg.reply(`Sorry! ${guild.name} hasn't set up their guild name in the bot configuration and does not allow non-guild-members to verify.\nTry contacting a server admin to have them finish configuration and then try verfying again.`);
        } else {
            msg.reply(`Sorry! You are not a guild member of ${guildConfig.realmGuildName} on RealmEye and this server does not allow for vefication of non-members.`);
        }
        return false;
    }
}

module.exports.checkForVerification = async (msg, client, db) => {
    if (msg.content.split(" ").length <= 1) {
        msg.reply(`You need to include your ign in the command. Try: \`!verify <ign>\``);
        return false;
    }
    const userDoc = db.collection("users").doc(msg.author.id);
    return userDoc.get().then(snapshot => {
        if (!snapshot.exists) {
            msg.reply(`Sorry, there was trouble finding a valid verification code in your RealmEye description... Please try again.\nIf you haven't begun the verification process yet, first go to a server's verification channel with this bot and type !verify to get a verification code to verify with that server.`);
            return false;
        }
        const userData = snapshot.data();
        const pendingGuilds = Object.keys(userData);
        const ign = msg.content.split(" ")[1];

        return tools.getRealmEyeInfo(ign).then(realmEye => {
            for (guildId of pendingGuilds) {
                if (!guildId) {
                    continue;
                }
                const veriCode = userData[guildId];

                // if user's RealmEye description has the correct verificiation code
                if (realmEye.description.includes(veriCode)) {
                    const guild = tools.getGuildById(client, guildId);

                    return db.collection("guilds").doc(guildId).get().then(snapshot => {
                        if (!snapshot.exists) {
                            msg.reply("could not find server data.");
                            return false;
                        }
                        const guildConfig = snapshot.data();

                        if (meetsReqs(guildConfig, realmEye)) {
                            return assignRoles(realmEye, guild, guildConfig, msg, db);
                        } else {
                            msg.reply(`Sorry, you don't meet the requirements for ${guildConfig.realmGuildName} of \`\`\`fix
                            Fame: ${guildConfig.fameReq}
                            Stars: ${guildConfig.rankReq}
                            6/8 charcters: ${guildConfig.sixEightReq}
                            8/8 characters: ${guildConfig.eightEightReq}
                            6/8 melees: ${guildConfig.sixEightMeleeReq}
                            8/8 melees: ${guildConfig.eightEightMeleeReq}\`\`\``);
                            return false;
                        }
                    }).catch(console.error);
                }
            }
            msg.reply(`Sorry, there was trouble finding a valid verification code in your RealmEye description... Please try again.\nIf you haven't begun the verification process yet, first go to a server's verification channel with this bot and type !verify to get a verification code to verify with that server.`);
            return false;
        }).catch(console.error);
    }).catch(console.error);
}