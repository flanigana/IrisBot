const tools = require("./tools");

const configPrefix = async (client, msg, p, args, doc) => {
    if (args.length === 0) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Prefix Configuration")
            .setDescription("The command prefix that the bot will use to identify commands.")
            .addFields(
                {name: "Instructions", value: `Change the command prefix for Iris Bot using:\`\`\`${p}config prefix <prefix>\`\`\``},
                {name: "Current Configuration", value: `${p}`},
            );
        msg.channel.send(embed);
        return true;

    } else {
        return doc.update({
            "guildName": msg.guild.name,
            "prefix": args[0],
        }).then(() => {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Prefix Configuration")
                .setDescription("Success! The command prefix was successfully changed!")
                .addFields(
                    {name: "New Prefix", value: `${args[0]}`},
                );
            msg.channel.send(embed);
            return true;
        }).catch(console.error);
    }
};

const configAdmins = async (client, msg, p, args, guildConfig, doc) => {
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    const admin = tools.isAdmin(guildMember, guildConfig);
    if (!admin) {
        msg.channel.send("Only the server owner can change the bot's admin roles!");
        return false;
    }

    if (args.length === 0) {
        const admins = guildConfig.admins;
        let adminsList = ``;
        for (let roleId of admins) {
            const role = tools.getRoleById(msg.guild, roleId);
            adminsList += adminsList === "" ? `${role}` : ` | ${role}`;
        }
        adminsList = adminsList != "" ? adminsList : "No admins set.";

        const embed = tools.getStandardEmbed(client)
            .setTitle("Admin Roles Configuration")
            .setDescription("Bot admins have permission to alter **any** of the bot's configuration settings (except for adding and removing admin roles).")
            .addFields(
                {name: "Instructions", value: `Change the admin roles using:\`\`\`${p}config admins <role> <role2> ... <roleN>\`\`\``},
                {name: "Admins", value: `${adminsList}`},
            );
        msg.channel.send(embed);
        return true;

    } else {
        let adminsList = ``;
        let newAdmins = [];
        for (let arg of args) {
            const role = tools.getRole(msg.guild, arg, msg);
            if (!role) {continue;}
            newAdmins.push(role.id);
            adminsList += adminsList === "" ? `${role}` : ` | ${role}`;
        }
        adminsList = adminsList != "" ? adminsList : "No admins set.";

        return doc.update({
            "guildName": msg.guild.name,
            "admins": newAdmins,
        }).then(() => {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Admin Roles Configuration")
                .setDescription("Success! Admin roles were successfully changed!")
                .addFields(
                    {name: "New Admin Roles", value: `${adminsList}`},
                );
            msg.channel.send(embed);
            return true;
        }).catch(console.error);
    }
};

const configMods = async (client, msg, p, args, guildConfig, doc) => {

    if (args.length === 0) {
        const mods = guildConfig.mods;
        let modsList = ``;
        for (let roleId of mods) {
            const role = tools.getRoleById(msg.guild, roleId);
            modsList += modsList === "" ? `${role}` : ` | ${role}`;
        }
        modsList = modsList != "" ? modsList : "No mods set.";

        const embed = tools.getStandardEmbed(client)
            .setTitle("Mod Roles Configuration")
            .setDescription("Mods have permissions for other bot settings, such as verification, but cannot alter the bot's sensitive configuration settings.")
            .addFields(
                {name: "Instructions", value: `Change the mod roles using:\`\`\`${p}config mods <role> <role2> ... <roleN>\`\`\``},
                {name: "Mods", value: `${modsList}`},
            );
        msg.channel.send(embed);
        return true;

    } else {
        let modsList = ``;
        let newMods = [];
        for (let arg of args) {
            const role = tools.getRole(msg.guild, arg, msg);
            if (!role) {continue;}
            newMods.push(role.id);
            modsList += modsList === "" ? `${role}` : ` | ${role}`;
        }
        modsList = modsList != "" ? modsList : "No mods set.";

        return doc.update({
            "guildName": msg.guild.name,
            "mods": newMods,
        }).then(() => {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Mod Roles Configuration")
                .setDescription("Success! Mod roles were successfully changed!")
                .addFields(
                    {name: "New Mod Roles", value: `${modsList}`},
                );
            msg.channel.send(embed);
            return true;
        }).catch(console.error);
    }
};

const configList = (client, msg, p, guildConfig) => {
    const admins = guildConfig.admins;
    let adminsList = ``;
    for (let roleId of admins) {
        const role = tools.getRoleById(msg.guild, roleId);
        adminsList += adminsList === "" ? `${role}` : ` | ${role}`;
    }
    adminsList = adminsList != "" ? adminsList : "No admins set.";

    const mods = guildConfig.mods;
    let modsList = ``;
    for (let roleId of mods) {
        const role = tools.getRoleById(msg.guild, roleId);
        modsList += modsList === "" ? `${role}` : ` | ${role}`;
    }
    modsList = modsList != "" ? modsList : "No mods set.";

    const embed = tools.getStandardEmbed(client)
        .setTitle("Server Configuration")
        .setDescription("Current Configuration List")
        .addFields(
            {name: "Command Prefix", value: `${p}`},
            {name: "Admin Roles", value: `${adminsList}`},
            {name: "Mod Roles", value: `${modsList}`},
        );
    msg.channel.send(embed);
    return true;
};

module.exports.configGuild = async (client, p, msg, guildConfig, db) => {
    const doc = db.collection("guilds").doc(msg.guild.id);
    
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    if (!tools.isAdmin(guildMember, guildConfig)) {
        return false;
    }

    let args = tools.getArgs(msg.content, p, 1);
    const command = args[0].toLowerCase();
    args = args.slice(1);

    switch (command) {
        case "prefix":
            configPrefix(client, msg, p, args, doc);
            break;
        case "admins":
            configAdmins(client, msg, p, args, guildConfig, doc);
            break;
        case "mods":
            configMods(client, msg, p, args, guildConfig, doc);
            break;
        case "list":
            configList(client, msg, p, guildConfig);
    }
};