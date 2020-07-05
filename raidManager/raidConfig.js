const tools = require("../tools");

const configDefaultRunTime = async (client, msg, p, args, guildConfig, doc) => {
    if (args.length === 0) {
        const runTime = guildConfig.defaultRunTimeSec ? guildConfig.defaultRunTimeSec : undefined;
        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Configuration")
            .setDescription("Raid Run Time")
            .addFields(
                {name: "Instructions", value: `Change the raid run time by using:\`\`\`${p}raid config runTime <seconds>\`\`\``},
                {name: "Current Configuration", value: `${runTime}`},
                {name: "Note", value: `The minimum default run time is 60 seconds. If you try and set it below that, it will be set to 60.
The maximum default run time is 1200 seconds. If you try and set it above that, it will be set to 1200.`}
            );
        msg.channel.send(embed);
        return true;

    } else {
        let runTime = parseInt(args[0]);
        if (typeof runTime != "number") {
            msg.channel.send(`${args[0]} is not a valid number.`);
            return false;
        }

        if (runTime < 60) {
            runTime = 60;
        } else if (runTime > 1200) {
            runTime = 1200;
        }

        return doc.update({
            "defaultRunTimeSec": runTime,
        }).then(() => {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Raid Configuration")
                .setDescription("Raid Run Time")
                .addFields(
                    {name: "Success!", value: "Raid run time name was successfully changed!"},
                    {name: "New Raid Run Time", value: `${runTime}`},
                    
                );
            msg.channel.send(embed);
            return true;
        }).catch(console.error);
    }
};

const configRaidLeaderRoles = async (client, msg, p, args, guildConfig, doc) => {
    if (args.length === 0) {
        const roles = guildConfig.raidLeaderRoles;
        let rolesList = ``;
        for (let roleId of roles) {
            const role = tools.getRoleById(msg.guild, roleId);
            if (rolesList === "") {
                rolesList += `${role}`;
            } else {
                rolesList += ` | ${role}`;
            }
        }
        if (rolesList === "") {
            rolesList = "No roles set.";
        }

        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Configuration")
            .setDescription("Raid Leader Roles")
            .addFields(
                {name: "Instructions", value: `Change the raid leader roles by using:\`\`\`${p}raid config raidLeaderRoles <role> <role2> ... <roleN>\`\`\``},
                {name: "Raid Leader Roles", value: `${rolesList}`},
            );
        msg.channel.send(embed);
        return true;

    } else {
        let rolesList = ``;
        let newRoles = [];
        for (let arg of args) {
            const role = tools.getRole(msg.guild, arg, msg);
            if (!role) {continue;}
            newRoles.push(role.id);
            if (rolesList === "") {
                rolesList += `${role}`;
            } else {
                rolesList += ` | ${role}`;
            }
        }
        if (rolesList === "") {
            rolesList = "No roles set.";
        }

        return doc.update({
            "raidLeaderRoles": newRoles,
        }).then(() => {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Raid Configuration")
                .setDescription("Raid Leader Roles")
                .addFields(
                    {name: "Success!", value: "Raid leader roles were successfully changed!"},
                    {name: "New Raid Leader Roles", value: `${rolesList}`},
                );
            msg.channel.send(embed);
            return true;
        }).catch(console.error);
    }
};

const configConfirmationChannel = async (client, msg, p, args, guildConfig, doc) => {
    let sendConfirmations = guildConfig.sendConfirmations;
    let confirmationChannel = guildConfig.confirmationChannel ? tools.getChannelById(msg.guild, guildConfig.confirmationChannel) : undefined;

    let promise = null;
    if (args.length === 0) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Configuration")
            .setDescription("React Confirmation Message Sending")
            .addFields(
                {name: "Instructions", value: `Configure the channel for the react confirmation message, use the following commands.
To send a message with react confirmations:
\`\`\`${p}raid config confirmationChannel <confirmationChannel>\`\`\`
To turn on/off confirmation message sending:
\`\`\`${p}raid config confirmationChannel <true/false>\`\`\``},
                {name: "Send Confirmations?", value: `${sendConfirmations}`, inline: true},
                {name: "Confirmation Channel", value: `${confirmationChannel}`, inline: true},
                {name: "Important Note", value: "Upon setting the channel value, confirmation sending will automatically be turned on."},
            );
        msg.channel.send(embed);
        return true;

    } else if (typeof args[0] === "boolean") {
        sendConfirmations = args[0];
        if (sendConfirmations === true && !confirmationChannel) {
            msg.channel.send("A confirmation channel must be set before setting this option to true. Setting a confirmation channel will automatically enable this option until you turn it off.");
            return false;
        }

        promise = doc.update({
            "sendConfirmations": sendConfirmations ? true : false,
        }).then(() => {return true;}).catch(console.error);

    } else {
        confirmationChannel = tools.getChannel(msg.guild, args[0], "text", msg);
        if (!confirmationChannel) {return false;}
        sendConfirmations = true;
        promise = doc.update({
            "sendConfirmations": sendConfirmations,
            "confirmationChannel": confirmationChannel.id,
        }).then(() => {return true;}).catch(console.error);
    }

    promise.then(() => {
        const embed = tools.getStandardEmbed(client)
                .setTitle("Raid Configuration")
                .setDescription("React Confirmation Message Sending")
                .addFields(
                    {name: "Success!", value: "Confirmation channel was successfully changed!"},
                    {name: "Send Confirmations?", value: `${sendConfirmations}`, inline: true},
                    {name: "Confirmation Channel", value: `${confirmationChannel}`, inline: true},
                );
            msg.channel.send(embed);
            return true;
    }).catch(console.error);
};

const configBooster = async (client, msg, p, args, guildConfig, doc) => {
    let allowBooster = guildConfig.allowBooster;
    let boosterRole = guildConfig.boosterRole ? tools.getRoleById(msg.guild, guildConfig.boosterRole) : undefined;

    let promise = null;
    if (args.length === 0) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Configuration")
            .setDescription("Early Booster Location")
            .addFields(
                {name: "Instructions", value: `Configure nitro booster options using the following commands.
To set the nitro booster role:
\`\`\`${p}raid config boosterRole <boosterRole>\`\`\`
To turn on/off allowing nitro boosters to react with booster role to get early location:
\`\`\`${p}raid config boosterRole <true/false>\`\`\``},
                {name: "Allow Boosters?", value: `${allowBooster}`, inline: true},
                {name: "Booster Role", value: `${boosterRole}`, inline: true},
                {name: "Important Note", value: "Upon setting the role value, allowing it will automatically be turned on."},
            );
        msg.channel.send(embed);
        return true;

    } else if (typeof args[0] === "boolean") {
        allowBooster = args[0];
        if (allowBooster === true && !boosterRole) {
            msg.channel.send("A role must be set before setting this option to true. Setting a role will automatically enable this option until you turn it off.");
            return false;
        }

        promise = doc.update({
            "allowBooster": allowBooster ? true : false,
        }).then(() => {return true;}).catch(console.error);

    } else {
        boosterRole = tools.getRole(msg.guild, args[0], msg);
        if (!boosterRole) {return false;}
        allowBooster = true;
        promise = doc.update({
            "allowBooster": allowBooster,
            "boosterRole": boosterRole.id,
        }).then(() => {return true;}).catch(console.error);
    }

    promise.then(() => {
        const embed = tools.getStandardEmbed(client)
                .setTitle("Raid Configuration")
                .setDescription("Early Booster Location")
                .addFields(
                    {name: "Success!", value: "Nitro booster role was successfully changed!"},
                    {name: "Allow Boosters?", value: `${allowBooster}`, inline: true},
                    {name: "Booster Role", value: `${boosterRole}`, inline: true},
                );
            msg.channel.send(embed);
            return true;
    }).catch(console.error);
};

const listRaidConfig = (client, msg, guildConfig) => {
    const roles = guildConfig.raidLeaderRoles;
    let rolesList = ``;
    for (let roleId of roles) {
        const role = tools.getRoleById(msg.guild, roleId);
        rolesList += rolesList === "" ? `${role}` : ` | ${role}`;
    }
    rolesList = rolesList != "" ? rolesList : "No roles set.";

    const embed = tools.getStandardEmbed(client)
        .setTitle("Raid Configuration")
        .setDescription("Here is the current raid configuration for this server.")
        .addFields(
            {name: "Raid Run Time", value: `${guildConfig.defaultRunTimeSec}`},
            {name: "Raid Leader Roles", value: `${rolesList}`},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Send Confirmations?", value: `${guildConfig.sendConfirmations}`, inline: true},
            {name: "Confirmation Channel", value: `${guildConfig.confirmationChannel ? tools.getChannelById(msg.guild, guildConfig.confirmationChannel) : undefined}`, inline: true},
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Allow Early Booster Location?", value: `${guildConfig.allowBooster}`, inline: true},
            {name: "Nitro Booster Role", value: `${guildConfig.boosterRole ? tools.getRoleById(msg.guild, guildConfig.boosterRole) : undefined}`, inline: true},
        );
    msg.channel.send(embed);
};

module.exports.configRaid = async (client, p, msg, guildConfig, db) => {
    let args = tools.getArgs(msg.content, p, 2);

    if (args.length === 0){
        const embed = tools.getStandardEmbed(client)
            .setTitle("Raid Configuration")
            .setDescription("Configure settings used within the raid manager.")
            .addFields(
                {name:"List Current Configuration", value: `\`\`\`${p}raid config list\`\`\``},
                {name:"Change Configuration", value: `\`\`\`${p}raid config runTime\n${p}raid config raidLeaderRoles\n${p}raid config confirmationChannel\n${p}raid config boosterRole\`\`\``},
            );
        msg.channel.send(embed);
        return true;
    }

    const doc = db.collection("guilds").doc(msg.guild.id);
    
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    if (!tools.isAdmin(guildMember, guildConfig)) {
        return false;
    }

    const command = args[0].toLowerCase();
    args = args.slice(1);

    switch (command) {
        case "list":
            return listRaidConfig(client, msg, guildConfig);
        case "runtime":
            return configDefaultRunTime(client, msg, p, args, guildConfig, doc);
        case "raidleaderroles":
            return configRaidLeaderRoles(client, msg, p, args, guildConfig, doc);
        case "confirmationchannel":
            return configConfirmationChannel(client, msg, p, args, guildConfig, doc);
        case "boosterRole":
            return configBooster(client, msg, p, args, guildConfig, doc);

    }
};