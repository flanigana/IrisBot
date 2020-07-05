const tools = require("../tools");
const verificationTools = require("./verificationTools");
const verificationTemplates = require("./verificationTemplates");
const modifyUser = require("./modifyUser");

module.exports.checkForIgnVerification = async (client, msg, db) => {
    if (msg.content.split(" ").length <= 1) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Error")
            .setDescription(`You need to include your ign in the command. Try: \`!verify <ign>\``);
        msg.author.send(embed);
        return false;
    }

    const userDoc = db.collection("users").doc(msg.author.id);
    return userDoc.get().then(snapshot => {
        if (!snapshot.exists) {
            return false;
        }

        const userData = snapshot.data();
        if (!userData.veriCode) {
            return false;
        }
        const veriCode = userData.veriCode;
        const ign = msg.content.split(" ")[1];

        return tools.getRealmEyeInfo(ign).then(realmEyeData => {
            // ign doesn't exist on RealmEye
            if (!realmEyeData.exists) {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("User Not Found")
                    .setDescription(`It looks like **${ign}** couldn't be found on RealmEye. Make sure you typed your username correctly or make sure you profile is not private.`);
                msg.author.send(embed);
                return false;
            }

            // successfully verify ign
            if (realmEyeData.description.includes(veriCode)) {
                verificationTools.updateIgnVerification(msg.author.id, realmEyeData.name, db);
                verificationTools.sendIgnVerificationSuccessMessage(client, msg, realmEyeData.name);
                return true;

            // can't verify ign
            } else {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("Error")
                    .setDescription(`There was trouble finding the verification code, \`${veriCode}\`, in **${realmEyeData.name}**'s RealmEye description...
\nPlease try again.`);
                msg.author.send(embed);
                return false;
            }
        });
    });
};

module.exports.beginIgnVerification = (client, msg, db) => {
    const userDoc = db.collection("users").doc(msg.author.id);
    return verificationTools.makeNewVeriCode(userDoc).then(veriCode => {
        verificationTools.sendIgnVerificationStartMessage(client, msg, veriCode);
        return true;
    }).catch(console.error);
};

const verifyUser = (client, msg, guildMember, template, realmEyeData, db, manual=false) => {
    let promises = [];

    // assign user roles
    promises.push(verificationTools.assignRoles(template, guildMember, realmEyeData));

    // update user's and server's verification list
    promises.push(verificationTools.updateServerVerification(msg, guildMember.user, template, db));

    // send user success message
    if (manual) {
        verificationTools.sendUserVerificationSuccess(client, msg, guildMember.user, template, manual);
    } else {
        verificationTools.sendUserVerificationSuccess(client, msg, msg.author, template, manual);
    }

    Promise.all(promises).then(() => {
        // send new verified user message to server
        return verificationTools.sendGuildVerificationSuccess(client, template, guildMember, realmEyeData, manual, msg.author);
    }).catch(console.error);
};

module.exports.manualVerify = async (client, p, msg, guildConfig, db) => {
    let args = tools.getArgs(msg.content, p, 1);
    let verifyUserId;
    if (args[0].startsWith("<@!") && args[0].endsWith(">")) {
        verifyUserId = args[0].substring(3, args[0].length-1);
    } else {
        verifyUserId = args[0];
    }

    const guildMember = msg.guild.members.cache.find(user => user.id === verifyUserId);
    // user id not found in server
    if (!guildMember) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("User Not Found In Server!")
            .setDescription(`User with the id of ${verifyUserId} was not found in this server.`);
        msg.channel.send(embed);
        return false;
    }

    let templateName = tools.verificationTemplateExists(args[1], guildConfig);
    // template name not found in server
    if (!templateName) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Verification Template Not Found!")
            .setDescription(`A verification template with the name of **${args[1]}** was not found in this server.
\nIf you need to check the names of your verification templates, use the \`${p}verification list\` command.`);
        msg.channel.send(embed);
        return false;
    }

    const userDoc = db.collection("users").doc(verifyUserId);
    return userDoc.get().then(currentUser => {
        if (!currentUser.exists) {
            // user needs to verify IGN first
            const embed = tools.getStandardEmbed(client)
                .setTitle("User Has No Verified IGN")
                .setDescription(`${guildMember} has not yet verified their IGN with Iris Bot.
They need to do this first by attempting to verify in any verification channel and following the steps in their DM from the bot.`);
            msg.channel.send(embed);
            return false;
        }

        const userData = currentUser.data();
        const ign =  userData.ign;
        if (!ign) {
            // user needs to verify IGN first
            const embed = tools.getStandardEmbed(client)
                .setTitle("User Has No Verified IGN")
                .setDescription(`${guildMember} has not yet verified their IGN with Iris Bot.
They need to do this first by attempting to verify in any verification channel and following the steps in their DM from the bot.`);
            msg.channel.send(embed);
            return false;
        }

        // set server nickname to realm ign
        if (guildMember.manageable) {
            promises.push(guildMember.setNickname(ign));
        }

        if (userData[`${msg.guild.id} | ${templateName}`]) {
            // user has already verified in the server using the template
            if (userData[`${msg.guild.id} | ${templateName}`] === "verified") {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("Already Verified!")
                    .setDescription(`${guildMember} has already been verified for 
**${msg.guild.name}**:${msg.channel}!`);
                msg.channel.send(embed);
                return true;
            }
        }
        

        return tools.getRealmEyeInfo(ign).then(realmEyeData => {
            if (!realmEyeData.exists) {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("User Not Found")
                    .setDescription(`It looks like **${ign}** couldn't be found on RealmEye. Make sure their profile is not private.
If **${ign}** is no longer their ign, they need to update it by DMing this bot with \`!updateIGN\` and follow the steps.`);
                msg.channel.send(embed);
                return false;
            }

            return tools.getVerificationTemplate(client, msg, templateName, guildConfig, db).then(template => {
                verifyUser(client, msg, guildMember, template, realmEyeData, db, true);

            }).catch(console.error);
        }).catch(console.error);
    }).catch(console.error);
};

const serverVerificationCheck = async (client, msg, templateName, guildConfig, db) => {
    const userDoc = db.collection("users").doc(msg.author.id);
    return userDoc.get().then(currentUser => {
        if (!currentUser.exists) {
            return false;
        }
        const userData = currentUser.data();
        const ign =  userData.ign;

        return tools.getRealmEyeInfo(ign).then(realmEyeData => {
            if (!realmEyeData.exists) {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("User Not Found")
                    .setDescription(`It looks like **${ign}** couldn't be found on RealmEye. Make sure your profile is not private.
If **${ign}** is no longer your ign, update it by responding with \`!updateIGN\` and follow the steps.`);
                msg.author.send(embed);
                return false;
            }

            const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);

            // set server nickname to realm ign
            if (guildMember.manageable) {
                guildMember.setNickname(realmEyeData.name);
            }

            return tools.getVerificationTemplate(client, msg, templateName, guildConfig, db).then(template => {

                // check if template is a guild type and if the verifying user is in the guild
                if (template.guildType && (realmEyeData.guild.toLowerCase() != template.guildName.toLowerCase())) {
                    verificationTools.sendUserNotInGuild(client, msg, template, realmEyeData);
                }

                if (verificationTools.meetsReqs(client, template, realmEyeData, msg)) {

                    // sends message to guild to notify that user meets reqs but is not in guild
                    if (template.guildType && (realmEyeData.guild.toLowerCase() != template.guildName.toLowerCase())) {
                        verificationTools.sendGuildVerificationGuildFailure(client, guildConfig.prefix, template, guildMember, realmEyeData);
                        return false;
                    }

                    verifyUser(client, msg, guildMember, template, realmEyeData, db, false);

                } else {
                    verificationTools.sendGuildVerificationReqFailure(client, guildConfig.prefix, template, guildMember, realmEyeData);
                    return false;
                }
            }).catch(console.error);
        }).catch(console.error);
    }).catch(console.error);
};

const beginVerification = async (client, msg, templateName, guildConfig, db) => {
    msg.delete();
    let guildId = msg.guild.id;

    const userDoc = db.collection("users").doc(msg.author.id);
    return userDoc.get().then(currentUser => {
        if (currentUser.exists) {
            const userData = currentUser.data();
            
            if (!userData.ign) {
                // user has not started or completed IGN verification
                this.beginIgnVerification(client, msg, db);
                return true;

            } else if (userData[`${guildId} | ${templateName}`]) {
                // user has already verified in the server using the template
                if (userData[`${guildId} | ${templateName}`] === "verified") {
                    const embed = tools.getStandardEmbed(client)
                        .setTitle("Already Verified!")
                        .setDescription(`You have already been verified for 
**${msg.guild.name}**:${msg.channel}!`);
                    msg.author.send(embed);
                    return true;
                } else {
                    // user has verified IGN -> start server verification
                    serverVerificationCheck(client, msg, templateName, guildConfig, db);
                    return true;
                }

            } else {
                // user has verified IGN -> start server verification
                serverVerificationCheck(client, msg, templateName, guildConfig, db);
                return true;
            }

        } else {
            this.beginIgnVerification(client, msg, db);
            return true;
        }
    }).catch(console.error);
};

module.exports.verification = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 0);
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    const isMod = tools.isMod(guildMember, guildConfig);

    switch (args[0].toLowerCase()) {
        case "verification":
            if (isMod) {
                verificationTemplates.verificationConfig(client, p, msg, guildConfig, db);
            }
            break;

        case "unverify":
            if (isMod) {
                // unverify
                modifyUser.modify(client, p, msg, guildConfig, db);
            }
            break;

        case "verify":
            const templateName = verificationTools.getChannelTemplateName(msg.channel.id, guildConfig);
            if (templateName) {
                beginVerification(client, msg, templateName, guildConfig, db);
            }
            break;
    }
};