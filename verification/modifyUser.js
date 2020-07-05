const tools = require("../tools");

const removeRoles = async (msg, guildMember, template) => {
    let roleList = [];
    if (template.guildRoles) {
        roleList.push(template.founderRole);
        roleList.push(template.leaderRole);
        roleList.push(template.officerRole);
        roleList.push(template.memberRole);
        roleList.push(template.initiateRole);
    }
    if (template.verifiedRole) {
        roleList.push(template.verifiedRole);
    }

    if (guildMember.manageable) {
        return guildMember.roles.remove(roleList, `Unverified from ${template.name} by ${msg.author}`);

    } else if (!guildMember.manageable) {
        if (roleList.length > 0) {
            let outrankMsg = `${guildMember} outranks IrisBot so the following roles were not removed: `;
            for (let role of roleList) {
                outrankMsg += `${role} `;
            }
            msg.channel.send(outrankMsg);
        }
        return false;
    }
};

const unverifyInDocs = async (guildId, userId, template, db) => {
    const userDoc = db.collection("users").doc(userId);

    let promises = [];

    promises.push(userDoc.update({
        [`${guildId} | ${template.name}`]: "unverified",
    }));

    let verifiedUsers = [];
    for (let user of template.verified) {
        if (user != userId) {
            verifiedUsers.push(user);
        }
    }
    
    promises.push(db.collection("guilds").doc(guildId).collection("verificationTemplates").doc(template.name).update({
        "verified": verifiedUsers,
    }));

    Promise.all(promises).then(() => {
        return true;
    }).catch(console.error);
};

const checkValidUser = async (client, msg, guildMember, templateName, db) => {
    return db.collection("users").doc(guildMember.id).get().then(currentUser => {
        if (currentUser.exists) {
            const userData = currentUser.data();
            
            if (userData[`${msg.guild.id} | ${templateName}`]) {
                // user has already verified in the server using the template
                if (userData[`${msg.guild.id} | ${templateName}`] === "verified") {
                    return true;
                } else {
                    const embed = tools.getStandardEmbed(client)
                        .setTitle("Error!")
                        .setDescription(`${guildMember} is not verified for ${templateName}!`);
                    msg.channel.send(embed);
                    return false;
                }

            } else {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("Error!")
                    .setDescription(`${guildMember} is not verified for ${templateName}!`);
                msg.channel.send(embed);
                return false;
            }

        } else {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Error!")
                .setDescription(`${guildMember} is not verified for ${templateName}!`);
            msg.channel.send(embed);
            return false;
        }
    }).catch(console.error);
};

const unverifyUser = async (client, msg, guildMember, templateName, guildConfig, db) => {
    const validUser = await checkValidUser(client, msg, guildMember, templateName, db);
    if (!validUser) {
        return false;
    }

    const template = await tools.getVerificationTemplate(client, msg, templateName, guildConfig, db);
    let promises = [];

    // remove user roles and remove user from verified list in template
    promises.push(removeRoles(msg, guildMember, template));
    promises.push(unverifyInDocs(msg.guild.id, guildMember.id, template, db));

    Promise.all(promises).then(() => {
        const embed = tools.getStandardEmbed(client)
            .setTitle(`${guildMember.displayName} Successfully Unverified`)
            .setDescription(`${guildMember} has been successfully unverified from the **${template.name}** list by ${msg.author}.`);
        msg.channel.send(embed);
        return true;
    }).catch(console.error);
};

module.exports.modify = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 0);
    if (args.length < 1) {
        return false;
    }
    const command = args[0].toLowerCase();
    let userId = args[1];
    if (userId.startsWith("<@!") && userId.endsWith(">")) {
        userId = userId.substring(3, userId.length-1);
    }

    const guildMember = msg.guild.members.cache.find(user => user.id === userId);
    if (!guildMember) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("User Not Found In Server!")
            .setDescription(`User with the id of ${userId} was not found in this server.`);
        msg.channel.send(embed);
        return false;
    }

    const templateName = tools.verificationTemplateExists(args[2], guildConfig);
    if (!templateName) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Verification Template Does Not Exist")
            .setDescription(`There is no verification template **${args[2]}** in this server.`);
        msg.channel.send(embed);
        return false;
    }

    switch (command) {
        case "unverify":
            unverifyUser(client, msg, guildMember, templateName, guildConfig, db);
            break;
    }
};