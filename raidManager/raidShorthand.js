const tools = require("../tools");
const raid = require("./raidStart");

const getShorthand = (actualName, guildConfig, db) => {
    return db.collection("guilds").doc(`${guildConfig.guildId}`).collection("shorthands").doc(actualName).get().then(snapshot => {
        if (!snapshot.exists) {
            return false;
        }

        return snapshot.data();
    });
};

const shorthandDoesNotExist = (client, msg, name) => {
    const embed = tools.getStandardEmbed(client)
            .setTitle(`${name} is Not a Valid Shorthand Name`)
            .setDescription(`Failed to find a shorthand with the name **${name}** in this server.`);
    msg.channel.send(embed);

};

const getShorthandName = (p, name, guildConfig) => {
    const shortName = name;
    let actualName;
    for (name of guildConfig.shorthandNames) {
        if (shortName.toLowerCase() === name.toLowerCase()) {
            actualName = name;
        }
    }

    return actualName;
};

/**
 * msg format: !r <templateName> <shortName> <location>
 */
module.exports.startShorthand = async (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 1);
    const actualName = getShorthandName(p, args[1], guildConfig);
    if (!actualName) {
        shorthandDoesNotExist(client, msg, args[1]);
        return false;
    }

    const shorthand = await getShorthand(actualName, guildConfig, db);

    const templateName = args[0];
    const idleName = tools.getChannelById(msg.guild, shorthand.idleVc);
    const destName = tools.getChannelById(msg.guild, shorthand.destVc);
    const alertName = tools.getChannelById(msg.guild, shorthand.alert);
    // "!raid start <templateName> <idleVc> <destVc> <alertChannel> <location>"
    const raidCommand = `!raid start "${templateName}" ${idleName} ${destName} ${alertName} ${args[2]}`;
    msg.content = raidCommand;
    raid.startRaid(client, p, msg, guildConfig, db);
};

const shorthandList = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 3);

    if (args.length === 0) {
        let embed = tools.getStandardEmbed(client)
            .setTitle("Existing Raid Shorthands")
            .setDescription(`To view details of a specific shorthand, use:
\`${p}raid shorthand list <shorthandName>\`.`);
        const shortNames = guildConfig.shorthandNames;
        let nameList = ``;
        for (const name of shortNames) {
            nameList += nameList === "" ? `${name}` : ` | ${name}`;
        }
        embed = embed.addField("Existing Shorthand Names", `${nameList}`);
        msg.channel.send(embed);

    } else {
        let shortName = args[0];
        for (const name of guildConfig.shorthandNames) {
            if (shortName.toLowerCase() === name.toLowerCase()) {
                shortName = name;
            }
        }

        return db.collection("guilds").doc(`${guildConfig.guildId}`).collection("shorthands").doc(`${shortName}`).get().then(snapshot => {
            if (!snapshot.exists) {
                return false;
            }
            const shorthand = snapshot.data();
            
            const embed = tools.getStandardEmbed(client)
                .setTitle(`${shortName} Shorthand Details`)
                .addFields(
                    {name: `Idle Voice Channel`, value: `${tools.getChannelById(msg.guild, shorthand.idleVc)}`, inline: true},
                    {name: `Destination Voice Channel`, value: `${tools.getChannelById(msg.guild, shorthand.destVc)}`, inline: true},
                    {name: `Alert Text Channel`, value: `${tools.getChannelById(msg.guild, shorthand.alert)}`, inline: true},
                );
            msg.channel.send(embed);
            return true;
        });
    }
};

const shorthandDelete = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 3);

    if (args.length === 0) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Deleting a Raid Shorthand")
            .setDescription(`To delete an existing shorthand, use:
\`\`\`${p}raid shorthand delete <shorthandName>\`\`\``);
        msg.channel.send(embed);
        return true;
    }

    const shortName = args[0];

    const guildDoc = db.collection("guilds").doc(guildConfig.guildId);
    
    let promises = [];
    promises.push(guildDoc.collection("shorthands").doc(`${shortName}`).delete());

    let newNames = [];
    for (const name of guildConfig.shorthandNames) {
        if (name.toLowerCase() != shortName.toLowerCase()) {
            newNames.push(name);
        }
    }
    promises.push(guildDoc.update({
        "shorthandNames": newNames,
    }));

    return Promise.all(promises).then(() => {
        const embed = tools.getStandardEmbed(client)
            .setTitle(`${shortName} Shorthand Was Successfully Deleted`);
        msg.channel.send(embed);
        return true;
    });
};

const saveShorthand = (shorthand, guildConfig, db) => {
    const guildDoc = db.collection("guilds").doc(guildConfig.guildId);
    
    let promises = [];
    promises.push(guildDoc.collection("shorthands").doc(`${shorthand.name}`).set({
        "idleVc": shorthand.idleVc,
        "destVc": shorthand.destVc,
        "alert": shorthand.alert,
    }));

    let newNames = guildConfig.shorthandNames;
    newNames.push(shorthand.name);
    promises.push(guildDoc.update({
        "shorthandNames": newNames,
    }));

    return Promise.all(promises);
};

const shorthandCreate = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 3);

    if (args.length === 0) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Creating a Raid Shorthand")
            .setDescription(`A raid shorthand is used to start a raid more efficiently using a shorter command.
To create a new shorthand, use:
\`\`\`${p}raid shorthand create <shorthandName> <idleVc> <destinationVc> <alertChannel>\`\`\`
After creating a shorthand, you can use it using:
\`\`\`${p}r <templateName> <shorthandName> <location>\`\`\``)
            .addFields(
                {name: "<shorthandName>", value: `The name you would like to use when calling this shorthand command.`},
                {name: "<idleVoiceChannel>", value: `The voice channel raiders must be in to be dragged into at the end of the check.`},
                {name: "<destVoiceChannel>", value: `The voice channel raiders will be dragged into at the end of the check.`},
                {name: "<alertTextChannel>", value: `The text channel that the raid status will be sent to.\nThe alert will be sent to the same channel as the command was sent in by default.`},
            );
        msg.channel.send(embed);
        return true;

    } else if (args.length < 4) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("Invalid Format for Shorthand Creation")
            .setDescription(`You must use the format of
\`\`\`${p}raid shorthand create <shorthandName> <idleVc> <destinationVc> <alertChannel>\`\`\``)
            .addFields(
                {name: "<shorthandName>", value: `The name you would like to use when calling this shorthand command.`},
                {name: "<idleVoiceChannel>", value: `The voice channel raiders must be in to be dragged into at the end of the check.`},
                {name: "<destVoiceChannel>", value: `The voice channel raiders will be dragged into at the end of the check.`},
                {name: "<alertTextChannel>", value: `The text channel that the raid status will be sent to.\nThe alert will be sent to the same channel as the command was sent in by default.`},
            );
        msg.channel.send(embed);
        return false;
    }

    const idleVc = tools.getChannel(msg.guild, args[1], "voice");
    const destVc = tools.getChannel(msg.guild, args[2], "voice");
    const alert = tools.getChannel(msg.guild, args[3], "text");
    if (!idleVc || !destVc || !alert) {
        let embed = tools.getStandardEmbed(client)
            .setTitle("Invalid Channel Names")
            .setDescription("One or more of the channel names provided could not be found in the server.");
        if (!idleVc) {
            embed = embed.addField("Invalid Idle Voice Channel", `${args[1]}`, true);
        }
        if (!destVc) {
            embed = embed.addField("Invalid Destination Voice Channel", `${args[2]}`, true);
        }
        if (!alert) {
            embed = embed.addField("Invalid Alert Text Channel", `${args[3]}`, true);
        }
        msg.channel.send(embed);
        return false;
    }

    const shorthand = {
        name: args[0],
        idleVc: idleVc.id,
        destVc: destVc.id,
        alert: alert.id,
    };

    return saveShorthand(shorthand, guildConfig, db).then(() => {
        const embed = tools.getStandardEmbed(client)
            .setTitle(`${shorthand.name} Shorthand Has Been Successfully Created`)
            .setDescription(`You can now use this shorthand using:
\`\`\`${p}r <templateName> ${shorthand.name} <location>\`\`\``);
        msg.channel.send(embed);
        return true;
    });
};

const shorthandHelp = (client, p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Raid Shorthands")
        .setDescription(`Raid shorthands are used to start raids more efficiently if the same settings are used often. This makes the process of starting a raid much quicker.
Use the following commands to manage your server's raid shorthands.`)
        .addFields(
            {name: "List Existing Shorthands", value: `\`\`\`${p}raid shorthand list\`\`\``},
            {name: "Shorthands Management", value: `\`\`\`${p}raid shorthand create\n${p}raid shorthand delete\`\`\``},
            {name: "Start a Raid With an Existing Shorthand", value: `\`\`\`${p}r <templateName> <shorthandName> <location>\`\`\``},
        );
    msg.channel.send(embed);
    return true;
};

module.exports.shorthand = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 2);
    if (args.length === 0) {
        shorthandHelp(client, p, msg);
        return true;
    }

    if ((args.length > 1) && (args[0] != "create") && (!getShorthandName(p, args[1], guildConfig))) {
        shorthandDoesNotExist(client, msg, args[1]);
        return false;
    } else if ((args.length > 1) && (args[0] === "create") && (getShorthandName(p, args[1], guildConfig))){
        const embed = tools.getStandardEmbed(client)
            .setTitle("Shorthand Name Already Exists")
            .setDescription(`There is already a shorthand named **${args[1]}** in this server. Please enter a unique shorthand name.`);
        msg.channel.send(embed);
        return false;
    }
    
    if (args[0] === "list") {
        return shorthandList(client, p, msg, guildConfig, db);
    } else if (args[0] === "create") {
        return shorthandCreate(client, p, msg, guildConfig, db);
    } else if (args[0] === "delete") {
        shorthandDelete(client, p, msg, guildConfig, db);
    }
};