const tools = require("./tools");

const configPrefix = async (client, msg, p, args, doc) => {
    if (args.length === 0) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Command Prefix")
            .addFields(
                {name: "Instructions", value: `Change the command prefix for Iris Bot by using:\`\`\`${p}config prefix <prefix>\`\`\``},
                {name: "Current Configuration", value: `${p}`},
            )
        msg.channel.send(embeded);
        return true;

    } else {
        return doc.update({
            "prefix": args[0],
        }).then(() => {
            const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Command Prefix")
                .addFields(
                    {name: "Success!", value: "The command prefix was successfully changed!"},
                    {name: "New Prefix", value: `${args[0]}`},
                )
            msg.channel.send(embeded);
            return true;
        }).catch(console.error);
    }
}

const configPermissions = async (client, msg, p, args, guildConfig, doc) => {
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    const admin = guildMember.hasPermission("admin");
    if (!admin) {
        msg.channel.send("Only a server admin can change the permissions!");
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
                permissionsList += ` | ${role}`;
            }
        }
        if (permissionsList === "") {
            permissionsList = "No permissions set.";
        }

        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Configuration Permissions")
            .addFields(
                {name: "Instructions", value: `Change the configuration permissions by using:\`\`\`${p}config permissions <role> <role2> ... <roleN>\`\`\``},
                {name: "Permissions", value: `${permissionsList}`},
                {name: "Important Note", value: "All server admins have configuration permissions."}
            )
        msg.channel.send(embeded);
        return true;

    } else {
        let permissionsList = ``;
        let newPermissions = [];
        for (arg of args) {
            const role = tools.getRole(msg.guild, arg, msg);
            if (!role) {continue;}
            newPermissions.push(role.id);
            if (permissionsList === "") {
                permissionsList += `${role}`;
            } else {
                permissionsList += ` | ${role}`;
            }
        }
        if (permissionsList === "") {
            permissionsList = "No permissions set.";
        }

        return doc.update({
            "permissions": newPermissions,
        }).then(() => {
            const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Configuration Permissions")
                .addFields(
                    {name: "Success!", value: "Configuration permissions were successfully changed!"},
                    {name: "New Permissions", value: `${permissionsList}`},
                    {name: "Important Note", value: "All server admins have configuration permissions."}
                )
            msg.channel.send(embeded);
            return true;
        }).catch(console.error);
    }
}

const configGuildName = async (client, msg, p, args, guildConfig, doc) => {
    if (args.length === 0) {
        const guildName = guildConfig.realmGuildName ? guildConfig.realmGuildName : undefined;
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Guild Name")
            .addFields(
                {name: "Instructions", value: `Change the guild name by using:\`\`\`${p}config guildName <name>\`\`\``},
                {name: "Current Configuration", value: `${guildName}`},
            )
        msg.channel.send(embeded);
        return true;

    } else {
        return doc.update({
            "realmGuildName": args[0],
        }).then(() => {
            const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Guild Name")
                .addFields(
                    {name: "Success!", value: "Guild name was successfully changed!"},
                    {name: "New Guild Name", value: `${args[0]}`},
                    
                )
            msg.channel.send(embeded);
            return true;
        }).catch(console.error);
    }
}

const configReqs = async (client, msg, p, args, guildConfig, doc) => {
    if (args.length === 0) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Verification Requirements")
            .addFields(
                {name: "Instructions", value: `Change the verification requirements by using:\`\`\`${p}config reqs <fame>
${p}config reqs <fame> <stars>\n${p}config reqs <fame> <stars> <6/8s> <8/8s>\n${p}config reqs <fame> <stars> <6/8s> <8/8s> <6/8 melees>
        <8/8 melees>\`\`\``},
                {name: "Fame", value: `${guildConfig.fameReq}`, inline: true},
                {name: "6/8s", value: `${guildConfig.sixEightReq}`, inline: true},
                {name: "8/8s", value: `${guildConfig.eightEightReq}`, inline: true},
                {name: "Rank", value: `${guildConfig.rankReq}`, inline: true},
                {name: "6/8 Melees", value: `${guildConfig.sixEightMeleeReq}`, inline: true},
                {name: "8/8 Melees", value: `${guildConfig.eightEightMeleeReq}`, inline: true},
            )
        msg.channel.send(embeded);
        return true;

    } else {
        const fame = parseInt(args[0]);
        const rank = args.length > 1 ? parseInt(args[1]) : 0;
        const sixEight = args.length > 2 ? parseInt(args[2]) : 0;
        const eightEight = args.length > 3 ? parseInt(args[3]) : 0;
        const sixEightMelee = args.length > 4 ? parseInt(args[4]) : 0;
        const eightEightMelee = args.length > 5 ? parseInt(args[5]) : 0;

        return doc.update({
            "fameReq": fame,
            "rankReq": rank,
            "sixEightReq": sixEight,
            "eightEightReq": eightEight,
            "sixEightMeleeReq": sixEightMelee,
            "eightEightMeleeReq": eightEightMelee,

        }).then(() => {
            const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Verification Requirements")
                .addFields(
                    {name: "Success!", value: "Verification requirements were successfully changed!"},
                    {name: "Fame", value: `${fame}`, inline: true},
                    {name: "6/8s", value: `${sixEight}`, inline: true},
                    {name: "8/8s", value: `${eightEight}`, inline: true},
                    {name: "Rank", value: `${rank}`, inline: true},
                    {name: "6/8 Melees", value: `${sixEightMelee}`, inline: true},
                    {name: "8/8 Melees", value: `${eightEightMelee}`, inline: true},
                )
            msg.channel.send(embeded);
            return true;
        }).catch(console.error);
    }
}

const configRoles = async (client, msg, p, args, guildConfig, doc) => {
    let assignRoles = guildConfig.assignRoles;
    let founder = guildConfig.founderRole ? tools.getRoleById(msg.guild, guildConfig.founderRole) : undefined;
    let leader = guildConfig.leaderRole ? tools.getRoleById(msg.guild, guildConfig.leaderRole) : undefined;
    let officer = guildConfig.officerRole ? tools.getRoleById(msg.guild, guildConfig.officerRole) : undefined;
    let member = guildConfig.memberRole ? tools.getRoleById(msg.guild, guildConfig.memberRole) : undefined;
    let initiate = guildConfig.initiateRole ? tools.getRoleById(msg.guild, guildConfig.initiateRole) : undefined;

    let promise = null;
    if (args.length === 0) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Auto-Assigned Roles")
            .addFields(
                {name: "Instructions", value: `Configure automatic assignment of roles according to guild rank using the following commands.
To assign roles used for each guild rank:
\`\`\`${p}config roles <founder> <leader> <officer> <member>\n        <initiate>\`\`\`
To turn on/off automatic role assignment:
\`\`\`${p}config roles <true/false>\`\`\``},
                {name: "Auto-Assign?", value: `${assignRoles}`, inline: true},
                {name: "Founder Role", value: `${founder}`, inline: true},
                {name: "Leader Role", value: `${leader}`, inline: true},
                {name: "Officer Role", value: `${officer}`, inline: true},
                {name: "Member Role", value: `${member}`, inline: true},
                {name: "Initiate Role", value: `${initiate}`, inline: true},
                {name: "Important Note", value: "Upon setting the role values, assignment for it will automatically be turned on."},
            )
        msg.channel.send(embeded);
        return true;

    } else if (typeof args[0] === "boolean") {
        assignRoles = args[0];

        if (assignRoles === true && !tools.checkRolesConfigured(guildConfig)) {
            msg.channel.send("All roles must be set before setting this option to true. Setting all roles will automatically enable this option until you turn it off.");
            return false;
        }

        promise = doc.update({
            "assignRoles": assignRoles,
        }).then(() => {return true;}).catch(console.error);

    } else if (args.length < 5) {
        msg.channel.send("You must set all roles at once.");
        return false;

    } else {
        founder = tools.getRole(msg.guild, args[0], msg);
        leader = tools.getRole(msg.guild, args[1], msg);
        officer = tools.getRole(msg.guild, args[2], msg);
        member = tools.getRole(msg.guild, args[3], msg);
        initiate = tools.getRole(msg.guild, args[4], msg);
        if (!founder || !leader || !officer || !member || !initiate) {return false;}

        promise = doc.update({
            "assignRoles": true,
            "founderRole": founder.id,
            "leaderRole": leader.id,
            "officerRole": officer.id,
            "memberRole": member.id,
            "initiateRole": initiate.id,
        }).then(() => {return true;}).catch(console.error);
    }

    promise.then(() => {
        const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Auto-Assigned Roles")
                .addFields(
                    {name: "Success!", value: "Auto-assigned roles were successfully changed!"},
                    {name: "Auto-Assign?", value: `${assignRoles}`, inline: true},
                    {name: "Founder Role", value: `${founder}`, inline: true},
                    {name: "Leader Role", value: `${leader}`, inline: true},
                    {name: "Officer Role", value: `${officer}`, inline: true},
                    {name: "Member Role", value: `${member}`, inline: true},
                    {name: "Initiate", value: `${initiate}`, inline: true},
                )
            msg.channel.send(embeded);
            return true;
    }).catch(console.error);
}

const configAllMemberRole = async (client, msg, p, args, guildConfig, doc) => {
    let assignAllMember = guildConfig.assignAllMember;
    let allMemberRole = guildConfig.allMemberRole ? tools.getRoleById(msg.guild, guildConfig.allMemberRole) : undefined;

    let promise = null;
    if (args.length === 0) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("All-Member Role Assignment")
            .addFields(
                {name: "Instructions", value: `Configure all-member role assignment using the following commands.
To give all members a common role upon verification:
\`\`\`${p}config allMemberRole <allMemberRole>\`\`\`
To turn on/off all-member role assignment:
\`\`\`${p}config allMemberRole <true/false>\`\`\``},
                {name: "Auto-Assign?", value: `${assignAllMember}`, inline: true},
                {name: "All Member Role", value: `${allMemberRole}`, inline: true},
                {name: "Important Note", value: "Upon setting the role value, assignment for it will automatically be turned on."},
            )
        msg.channel.send(embeded);
        return true;

    } else if (typeof args[0] === "boolean") {
        assignAllMember = args[0];
        if (assignAllMember === true && !allMemberRole) {
            msg.channel.send("A role must be set before setting this option to true. Setting a role will automatically enable this option until you turn it off.");
            return false;
        }

        promise = doc.update({
            "assignAllMember": assignAllMember ? true : false,
        }).then(() => {return true;}).catch(console.error);

    } else {
        allMemberRole = tools.getRole(msg.guild, args[0], msg);
        if (!allMemberRole) {return false;}
        promise = doc.update({
            "assignAllMember": true,
            "allMemberRole": allMemberRole.id,
        }).then(() => {return true;}).catch(console.error);
    }

    promise.then(() => {
        const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("All-Member Role Assignment")
                .addFields(
                    {name: "Success!", value: "All-member role was successfully changed!"},
                    {name: "Auto-Assign?", value: `${assignAllMember}`, inline: true},
                    {name: "All Member Role", value: `${allMemberRole}`, inline: true},
                )
            msg.channel.send(embeded);
            return true;
    }).catch(console.error);
}

const configNonMemberRole = async (client, msg, p, args, guildConfig, doc) => {
    let assignNonMember = guildConfig.assignNonMember;
    let nonMemberRole = guildConfig.nonMemberRole ? tools.getRoleById(msg.guild, guildConfig.nonMemberRole) : undefined;

    let promise = null;
    if (args.length === 0) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Non-Member Role Assignment")
            .addFields(
                {name: "Instructions", value: `Configure non-member role assignment using the following commands.
To give non-members a common role upon verification:
\`\`\`${p}config nonMemberRole <nonMemberRole>\`\`\`
To turn on/off non-member role assignment:
\`\`\`${p}config nonMemberRole <true/false>\`\`\``},
                {name: "Auto-Assign?", value: `${assignNonMember}`, inline: true},
                {name: "Non Member Role", value: `${nonMemberRole}`, inline: true},
                {name: "Important Note", value: "Upon setting the role value, assignment for it will automatically be turned on."},
            )
        msg.channel.send(embeded);
        return true;

    } else if (typeof args[0] === "boolean") {
        assignNonMember = args[0];
        if (assignNonMember === true && !nonMemberRole) {
            msg.channel.send("A role must be set before setting this option to true. Setting a role will automatically enable this option until you turn it off.");
            return false;
        }

        promise = doc.update({
            "assignNonMember": args[0],
        }).then(() => {return true;}).catch(console.error);

    } else {
        nonMemberRole = tools.getRole(msg.guild, args[0], msg);
        if (!nonMemberRole) {return false;}
        promise = doc.update({
            "assignNonMember": true,
            "nonMemberRole": nonMemberRole.id,
        }).then(() => {return true;}).catch(console.error);
    }

    promise.then(() => {
        const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Non-Member Role Assignment")
                .addFields(
                    {name: "Success!", value: "Non-member role was successfully changed!"},
                    {name: "Auto-Assign?", value: `${assignNonMember}`, inline: true},
                    {name: "All Member Role", value: `${nonMemberRole}`, inline: true},
                )
            msg.channel.send(embeded);
            return true;
    }).catch(console.error);
}

const configVerificationChannel = async (client, msg, p, args, guildConfig, doc) => {
    let globalVerification = guildConfig.globalVerification;
    let verificationChannel = guildConfig.verificationChannel ? tools.getChannelById(msg.guild, guildConfig.verificationChannel) : undefined;
    let verificationLogChannel = guildConfig.verificationLogChannel ? tools.getChannelById(msg.guild, guildConfig.verificationLogChannel) : undefined;

    let promise = null;
    if (args.length === 0) {
        const embeded = tools.getStandardEmbeded(client)
            .setTitle("Configuration")
            .setDescription("Verification Channel")
            .addFields(
                {name: "Instructions", value: `Change the verification channel by using:\`\`\`${p}config verificationChannel <verificationChannel>\`\`\`
To set the verification channel with a different channel for the logs use:
\`\`\`${p}config verificationChannel <verificationChannel>\n        <logChannel>\`\`\`
To turn on/off global verification (ability to begin verification from any channel):
\`\`\`${p}config nonMemberRole <true/false>\`\`\``},
                {name: "Allow Global Verification?", value: `${globalVerification}`, inline: true},
                {name: "Verification Channel", value: `${verificationChannel}`, inline: true},
                {name: "Verification Log Channel", value: `${verificationLogChannel}`, inline: true},
            )
        msg.channel.send(embeded);
        return true;

    } else if (typeof args[0] === "boolean") {
        globalVerification = args[0];

        promise = doc.update({
            "globalVerification": globalVerification,
        }).then(() => {return true;}).catch(console.error);

    } else if (args.length === 1) {
        verificationChannel = tools.getChannel(msg.guild, args[0], msg);
        verificationLogChannel = verificationChannel;
        if (!verificationChannel) {return false;}
        promise = doc.update({
            "verificationChannel": verificationChannel.id,
            "verificationLogChannel": verificationLogChannel.id,
        }).then(() => {return true;}).catch(console.error);

    } else {
        verificationChannel = tools.getChannel(msg.guild, args[0], msg);
        verificationLogChannel = tools.getChannel(msg.guild, args[1], msg);
        if (!verificationChannel || !verificationLogChannel) {return false;}
        promise = doc.update({
            "verificationChannel": verificationChannel.id,
            "verificationLogChannel": verificationLogChannel.id,
        }).then(() => {return true;}).catch(console.error);
    }

    promise.then(() => {
        const embeded = tools.getStandardEmbeded(client)
                .setTitle("Configuration")
                .setDescription("Verification Channel")
                .addFields(
                    {name: "Success!", value: "Verification channel successfully changed!"},
                    {name: "Allow Global Verification?", value: `${globalVerification}`, inline: true},
                    {name: "Verification Channel", value: `${verificationChannel}`, inline: true},
                    {name: "Verification Log Channel", value: `${verificationLogChannel}`, inline: true},
                )
            msg.channel.send(embeded);
            return true;
    }).catch(console.error);
}

const configList = (client, msg, guildConfig) => {
    const permissions = guildConfig.permissions;
    let permissionsList = ``;
    for (roleId of permissions) {
        const role = tools.getRoleById(msg.guild, roleId);
        if (permissionsList === "") {
            permissionsList += `${role}`;
        } else {
            permissionsList += ` | ${role}`;
        }
    }
    if (permissionsList === "") {
        permissionsList = "No permissions set.";
    }

    const embeded = tools.getStandardEmbeded(client)
        .setTitle("Configuration")
        .setDescription("Current Configuration List")
        .addFields(
            {name: "Command Prefix", value: `${guildConfig.prefix}`, inline: true},
            {name: "Guild Name", value: `${guildConfig.realmGuildName}`, inline: true},
            {name: "Permissions", value: `${permissionsList}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Verification Requirements", value: `-----------------------------------------------------------------------------------------------`},
            {name: "Fame", value: `${guildConfig.fameReq}`, inline: true},
            {name: "6/8s", value: `${guildConfig.sixEightReq}`, inline: true},
            {name: "6/8 Melees", value: `${guildConfig.sixEightMeleeReq}`, inline: true},
            {name: "Rank", value: `${guildConfig.rankReq}`, inline: true},
            {name: "8/8s", value: `${guildConfig.eightEightReq}`, inline: true},
            {name: "8/8 Melees", value: `${guildConfig.eightEightMeleeReq}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Auto-Assign Guild Roles?", value: `${guildConfig.assignRoles}`, inline: true},
            {name: "Guild Roles", value: `Founder: ${guildConfig.founderRole ? tools.getRoleById(msg.guild, guildConfig.founderRole) : undefined}
Leader: ${guildConfig.leaderRole ? tools.getRoleById(msg.guild, guildConfig.leaderRole) : undefined}
Officer: ${guildConfig.officerRole ? tools.getRoleById(msg.guild, guildConfig.officerRole) : undefined}
Member: ${guildConfig.memberRole ? tools.getRoleById(msg.guild, guildConfig.memberRole) : undefined}
Initiate: ${guildConfig.initiateRole ? tools.getRoleById(msg.guild, guildConfig.initiateRole) : undefined}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Auto-Assign All Members?", value: `${guildConfig.assignAllMember}`, inline: true},
            {name: "All Member Role", value: `${guildConfig.allMemberRole ? tools.getRoleById(msg.guild, guildConfig.allMemberRole) : undefined}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Auto-Assign Non-Members?", value: `${guildConfig.assignNonMember}`, inline: true},
            {name: "Non Member Role", value: `${guildConfig.nonMemberRole ? tools.getRoleById(msg.guild, guildConfig.nonMemberRole) : undefined}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Allow Global Verification?", value: `${guildConfig.globalVerification}`, inline: true},
            {name: "Verification Channel", value: `${guildConfig.verificationChannel ? tools.getChannelById(msg.guild, guildConfig.verificationChannel) : undefined}`, inline: true},
            {name: "Verification Log Channel", value: `${guildConfig.verificationLogChannel ? tools.getChannelById(msg.guild, guildConfig.verificationLogChannel) : undefined}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
        )
    msg.channel.send(embeded);
    return true;
}

module.exports.configGuild = async (client, msg, db) => {
    const doc = db.collection("guilds").doc(msg.guild.id);
    doc.get().then(snapshot => {
        if (!snapshot.exists) {
            msg.channel.send("Server data not found!");
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
    
        // msg.content = tools.normalizeNaming(msg);
        const p = guildConfig.prefix;
        const command = tools.getCommand(msg.content, `${p}config`);
        const args = tools.getArgs(msg.content, 2);
    
        if (command === "prefix") {
            return configPrefix(client, msg, p, args, doc);
        } else if (command === "permissions") {
            return configPermissions(client, msg, p, args, guildConfig, doc);
        } else if (command === "guildname") {
            return configGuildName(client, msg, p, args, guildConfig, doc);
        } else if (command === "reqs") {
            return configReqs(client, msg, p, args, guildConfig, doc);
        } else if (command === "roles") {
            return configRoles(client, msg, p, args, guildConfig, doc);
        } else if (command === "allmemberrole") {
            return configAllMemberRole(client, msg, p, args, guildConfig, doc);
        } else if (command === "nonmemberrole") {
            return configNonMemberRole(client, msg, p, args, guildConfig, doc);
        } else if (command === "verificationchannel") {
            return configVerificationChannel(client, msg, p, args, guildConfig, doc);
        } else if (command === "list") {
            return configList(client, msg, guildConfig);
        } else {
            const fullCommand = `${p}config ${command}`;
            msg.reply(`"${fullCommand}" is not a valid command!`);
            return false;
        }

    }).catch(console.error);
}