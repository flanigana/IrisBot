const tools = require("./tools");

const configPermissions = async (msg, args, guildConfig, doc) => {
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    const admin = guildMember.hasPermission("admin");
    if (!admin) {
        msg.reply("only a server admin can change the permissions!");
        return false;
    }

    if (args.length === 0) {
        const permissions = guildConfig.permissions;
        let permissionsList = ``;
        for (roleId of permissions) {
            const role = tools.getRoleById(msg.guild, roleId);
            if (permissionsList === "") {
                permissionsList += `${role}`;
            } else {
                permissionsList += ` ${role}`;
            }
        }
        
        msg.reply(`change configuration permissions using:
        \`!config permissions <roleName> <roleName2> <...>\`
        
        Current configuration is:
        ${permissionsList}
        (Note: all server admins have configuration permissions)`);
        return true;
    } else {
        let messageContents = `the following roles now have configuration permissions:`;
        let newPermissions = [];
        for (arg of args) {
            const role = tools.getRoleByName(msg.guild, arg, msg);
            if (!role) {return false;}
            newPermissions.push(role.id);
            messageContents += ` ${role}`;
        }

        return doc.update({
            "permissions": newPermissions,
        }).then(() => {
            msg.reply(messageContents);
            return true;
        }).catch(console.error);
    }
}

const configGuildName = async (msg, args, guildConfig, doc) => {
    if (args.length === 0) {
        msg.reply(`change guild name by using:
        \`!config guildName <name>\`
        
        Current configuration is:
        ${guildConfig.realmGuildName}`);
        return true;

    } else {
        return doc.update({
            "realmGuildName": args[0],
        }).then(() => {
            msg.reply(`guild name changed to ${args[0]}.`);
            return true;
        }).catch(console.error);
    }
}

const configReqs = async (msg, args, guildConfig, doc) => {
    if (args.length === 0) {
        msg.reply(`must at least include a fame amount in order to update. For example:
        \`!config reqs <fame>\`
        \`!config reqs <fame> <stars>\`
        \`!config reqs <fame> <stars> <num of 6/8s> <num of 8/8s>\`
        \`!config reqs <fame> <stars> <num of 6/8s> <num of 8/8s> <num of 6/8 melees> <num of 8/8 melees>\`
            
        Current configuration is:\`\`\`fix
        Fame: ${guildConfig.fameReq}
        Stars: ${guildConfig.rankReq}
        6/8s: ${guildConfig.sixEightReq}
        8/8s: ${guildConfig.eightEightReq}
        6/8 Melees: ${guildConfig.sixEightMeleeReq}
        8/8 Melees: ${guildConfig.eightEightMeleeReq}\`\`\``);
        return true;

    } else {
        let newReqs = {};
        newReqs.fame = parseInt(args[0]);
        newReqs.rank = args.length > 1 ? parseInt(args[1]) : 0;
        newReqs.sixEight = args.length > 2 ? parseInt(args[2]) : 0;
        newReqs.eightEight = args.length > 3 ? parseInt(args[3]) : 0;
        newReqs.sixEightMelee = args.length > 4 ? parseInt(args[4]) : 0;
        newReqs.eightEightMelee = args.length > 5 ? parseInt(args[5]) : 0;

        return doc.update({
            "fameReq": newReqs.fame,
            "rankReq": newReqs.rank,
            "sixEightReq": newReqs.sixEight,
            "eightEightReq": newReqs.eightEight,
            "sixEightMeleeReq": newReqs.sixEightMelee,
            "eightEightMeleeReq": newReqs.eightEightMelee,

        }).then(() => {
            msg.reply(`guild requirements changed to:\`\`\`fix
        Fame: ${newReqs.fame}
        Stars: ${newReqs.rank}
        6/8s: ${newReqs.sixEight}
        8/8s: ${newReqs.eightEight}
        6/8 Melees: ${newReqs.sixEightMelee}
        8/8 Melees: ${newReqs.eightEightMelee}\`\`\``);
            return true;
        }).catch(console.error);
    }
}

const configRoles = async (msg, args, guildConfig, doc) => {
    if (args.length === 0) {
        const founder = guildConfig.founderRole ? tools.getRoleById(msg.guild, guildConfig.founderRole) : undefined;
        const leader = guildConfig.leaderRole ? tools.getRoleById(msg.guild, guildConfig.leaderRole) : undefined;
        const officer = guildConfig.officerRole ? tools.getRoleById(msg.guild, guildConfig.officerRole) : undefined;
        const member = guildConfig.memberRole ? tools.getRoleById(msg.guild, guildConfig.memberRole) : undefined;
        const initiate = guildConfig.initiateRole ? tools.getRoleById(msg.guild, guildConfig.initiateRole) : undefined;

        msg.reply(`to configure role automatic assignment:
        To assign roles to all guild ranks:
        \`!config roles <founderRoleName> <leaderRoleName> <officerRoleName> <memberRoleName> <initiateRoleName>\`
        To turn on/off automatic role assignment:
        \`!config roles true/false\`

        Current configuration is:
        Auto-Assign Roles Based on Guild Rank? ${guildConfig.assignRoles}
        founder: ${founder}
        leader: ${leader}
        officer: ${officer}
        member: ${member}
        initiate: ${initiate}`);
        return true;

    } else if (typeof args[0] === "boolean") {
        if (args[0] === true && !tools.checkRolesConfigured(guildConfig)) {
            msg.reply("you must set all roles before setting this option to true. Setting all roles will automatically enable this option until you turn it off.");
            return false;
        }

        return doc.update({
            "assignRoles": args[0],
        }).then(() => {
            msg.reply(`roles will ${args[0] ? "now" : "no longer"} be auto-assigned.`);
            return true;
        }).catch(console.error);

    } else if (args.length < 5) {
        msg.reply("you must set all roles at once.");
        return false;

    } else {
        const founder = tools.getRoleByName(msg.guild, args[0], msg);
        const leader = tools.getRoleByName(msg.guild, args[1], msg);
        const officer = tools.getRoleByName(msg.guild, args[2], msg);
        const member = tools.getRoleByName(msg.guild, args[3], msg);
        const initiate = tools.getRoleByName(msg.guild, args[4], msg);
        if (!founder || !leader || !officer || !member || !initiate) {return false;}

        return doc.update({
            "assignRoles": true,
            "founderRole": founder.id,
            "leaderRole": leader.id,
            "officerRole": officer.id,
            "memberRole": member.id,
            "initiateRole": initiate.id,
        }).then(() => {
            msg.reply(`auto assigned roles changed to:
        founder: ${founder}
        leader: ${leader}
        officer: ${officer}
        member: ${member}
        initiate: ${initiate}`);
            return true;
        }).catch(console.error);
    }
}

const configAllMemberRole = async (msg, args, guildConfig, doc) => {
    if (args.length === 0) {
        let allMemberRole = guildConfig.allMemberRole ? tools.getRoleById(msg.guild, guildConfig.allMemberRole) : undefined;
        msg.reply(`to configure all-member role assignment:
        To give all members a common role upon verification:
        \`!config allMemberRole <allMemberRoleName>\`
        To no longer give all members a common role upon verification:
        \`!config allMemberRole false\`
        To no re-enable this option with the previous configuration:
        \`!config allMemberRole true\`
        
        Current configuration is:
        Assign Common Role to All Members? ${guildConfig.assignAllMember}
        Non-Member Role: ${allMemberRole}`);
        return;

    } else if (typeof args[0] === "boolean") {
        if (args[0] === true && !guildConfig.allMemberRole) {
            msg.reply("you must set a role before setting this option to true. Setting a role will automatically enable this option until you turn it off.");
            return false;
        }

        return doc.update({
            "assignAllMember": args[0] ? true : false,
        }).then(() => {
            msg.reply(`members will ${args[0] ? "now" : "no longer"} recieve a common role.`);
            return true;
        }).catch(console.error);

    } else {
        const allMember = tools.getRoleByName(msg.guild, args[0], msg);
        if (!allMember) {return false;}
        return doc.update({
            "assignAllMember": true,
            "allMemberRole": allMember.id,
        }).then(() => {
            msg.reply(`all member role changed to ${allMember}.`);
            return true;
        }).catch(console.error);
    }
}

const configNonMemberRole = async (msg, args, guildConfig, doc) => {
    if (args.length === 0) {
        const nonMemberRole = guildConfig.nonMemberRole ? tools.getRoleById(msg.guild, guildConfig.nonMemberRole) : undefined;
        msg.reply(`to configure non-member verification:
        To allow non-members to verify and be assigned a role:
        \`!config nonMemberRole <nonMemberRoleName>\`
        To no longer allow non-members to verify and be assigned a role:
        \`!config nonMemberRole false\`
        To no re-enable this option with the previous configuration:
        \`!config nonMemberRole true\`
        
        Current configuration is:
        Allow Non-Member Verification? ${guildConfig.assignNonMember}
        Non-Member Role: ${nonMemberRole}`);
        return true;

    } else if (typeof args[0] === "boolean") {
        if (args[0] === true && !guildConfig.nonMemberRole) {
            msg.reply("you must set a role before setting this option to true. Setting a role will automatically enable this option until you turn it off.");
            return false;
        }

        return doc.update({
            "assignNonMember": args[0],
        }).then(() => {
            msg.reply(`non-members will ${args[0] ? "now" : "no longer"} be able to join.`);
            return true;
        }).catch(console.error);

    } else {
        const nonMember = tools.getRoleByName(msg.guild, args[0], msg);
        if (!nonMember) {return false;}
        return doc.update({
            "assignNonMember": true,
            "nonMemberRole": nonMember.id,
        }).then(() => {
            msg.reply(`non-member role changed to ${nonMember}.`);
            return true;
        }).catch(console.error);
    }
}

const configVerificationChannel = async (msg, args, guildConfig, doc) => {
    if (args.length === 0) {
        let verificationChannel = guildConfig.verificationChannel ? tools.getChannelById(msg.guild, guildConfig.verificationChannel) : undefined;
        let logChannel = guildConfig.verificationLogChannel ? tools.getChannelById(msg.guild, guildConfig.verificationLogChannel) : undefined;
        msg.reply(`to set verification channel:
        \`!config verificationChannel <verificationChannelName>\`
        or to set verification channel and a different channel for the logs
        \`!config verificationChannel <verificationChannelName> <logChannelName>\`
        
        Current configuration is:
        Verification Channel: ${verificationChannel}
        Verification Log Channel: ${logChannel}`);
        return true;
    }

    if (args.length === 1) {
        const channel = tools.getChannelByName(msg.guild, args[0], msg);
        if (!channel) {return false;}
        return doc.update({
            "verificationChannel": channel.id,
            "verificationLogChannel": channel.id,
        }).then(() => {
            msg.reply(`verification channel changed to ${channel}.`);
            return true;
        }).catch(console.error);
    } else {
        const verificationChannel = tools.getChannelByName(msg.guild, args[0], msg);
        const logChannel = tools.getChannelByName(msg.guild, args[1], msg);
        if (!verificationChannel || !logChannel) {return false;}
        return doc.update({
            "verificationChannel": verificationChannel.id,
            "verificationLogChannel": logChannel.id,
        }).then(() => {
            msg.reply(`verification channel changed to ${verificationChannel} and log channel changed to ${logChannel}.`);
            return true;
        }).catch(console.error);
    }
}

const configList = (msg, guildConfig) => {
    let message = `\`\`\``;
    message += `Guild Name: ${guildConfig.realmGuildName}\n`;
    const permissions = guildConfig.permissions;
    let permissionsList = ``;
    for (roleId of permissions) {
        const role = tools.getRoleById(msg.guild, roleId);
        if (permissionsList === "") {
            permissionsList += `\nPermissions: ${role.name}`;
        } else {
            permissionsList += ` ${role.name}`;
        }
    }
    message += `${permissionsList}\n`;
    let reqs = `\nRequirements: {\n`;
    reqs += `   Fame: ${guildConfig.fameReq}\n`;
    reqs += `   Rank: ${guildConfig.rankReq}\n`;
    reqs += `   6/8s: ${guildConfig.sixEightReq}\n`;
    reqs += `   8/8s: ${guildConfig.eightEightReq}\n`;
    reqs += `   6/8 Melees: ${guildConfig.sixEightMeleeReq}\n`;
    reqs += `   8/8 Melees: ${guildConfig.eightEightMeleeReq}\n`;
    reqs += `}\n`;
    message += reqs;
    message += `\nAssign Guild Roles? ${guildConfig.assignRoles}\n`;
    message += `    Founder Role: ${tools.getRoleById(msg.guild, guildConfig.founderRole).name}\n`;
    message += `    Leader Role: ${tools.getRoleById(msg.guild, guildConfig.leaderRole).name}\n`;
    message += `    Officer Role: ${tools.getRoleById(msg.guild, guildConfig.officerRole).name}\n`;
    message += `    Member Role: ${tools.getRoleById(msg.guild, guildConfig.memberRole).name}\n`;
    message += `    Initiate Role: ${tools.getRoleById(msg.guild, guildConfig.initiateRole).name}\n`;
    message += `\nAssign All-Member Role? ${guildConfig.assignAllMember}\n`;
    message += `    All-Member Role: ${tools.getRoleById(msg.guild, guildConfig.allMemberRole).name}\n`;
    message += `\nAllow Non-Guild-Members? ${guildConfig.assignNonMember}\n`;
    message += `    Non-Guild-Member Role: ${tools.getRoleById(msg.guild, guildConfig.nonMemberRole).name}\n`;
    message += `\nVerification Channel: ${tools.getChannelById(msg.guild, guildConfig.verificationChannel).name}\n`;
    message += `Verification Log Channel: ${tools.getChannelById(msg.guild, guildConfig.verificationLogChannel).name}\n`;
    message += `\`\`\``;
    msg.reply(message);
}

module.exports.configGuild = async (msg, db) => {
    const doc = db.collection("guilds").doc(msg.guild.id);
    doc.get().then(snapshot => {
        if (!snapshot.exists) {
            msg.reply("server data not found.");
            return false
        }
        const guildConfig = snapshot.data();

        const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
        const admin = guildMember.hasPermission("admin");
    
        if (!admin) {
            const permissions = guildConfig.permissions;
            let hasPermission = false;
            for (role of permissions) {
                if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
                    hasPermission = true;
                    break;
                }
            }
        
            if (!hasPermission) {
                msg.reply("you do not have permission to change the server configuration!");
                return false;
            }
        }
    
        msg.content = tools.normalizeNaming(msg);
        const args = tools.getArgs(msg.content);
    
        if (msg.content.startsWith("!config permissions")) {
            return configPermissions(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config guildName")) {
            return configGuildName(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config reqs")) {
            return configReqs(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config roles")) {
            return configRoles(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config allMembersRole")) {
            return configAllMemberRole(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config nonMember")) {
            return configNonMemberRole(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config verificationChannel")) {
            return configVerificationChannel(msg, args, guildConfig, doc);
        } else if (msg.content.startsWith("!config list")) {
            return configList(msg, guildConfig);
        } else {
            const split = msg.content.split(" ");
            const command = split[0] + " " + split[1];
            msg.reply(`"${command}" is not a valid command!`);
            return false;
        }

    }).catch(console.error);
}