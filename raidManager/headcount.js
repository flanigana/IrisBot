const tools = require("../tools");
const raidTools = require("./raidTools");

const sendHeadcount = (client, msg, channel, template) => {
    // load template primary and secondary reacts
    const primaryEmoji = raidTools.formatPrimaryEmoji(client, template, msg.guild.id);
    const secondaryEmojis = raidTools.formatSecondaryEmojis(client, template, msg.guild.id);
    
    let embed = tools.getStandardEmbed(client)
        .setTitle(`A ${template.name} headcount has been started by ${msg.member.displayName}`)
        .setDescription(`React with ${primaryEmoji} if you would like a ${template.name} to start.
React with ${secondaryEmojis} if applicable.`);

    // send ping and headcount message and add reacts
    channel.send("@here");
    channel.send(embed).then(sent => {
        sent.react(primaryEmoji);
        for (const emoji of secondaryEmojis) {
            sent.react(emoji);
        }
    });
}

const sendGenericHeadcount = (client, msg, channel) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`A headcount has been started by ${msg.member.displayName}.`)
        .setDescription(`React with ✅ if you would like a raid to start.`);

    // send ping and headcount message and add the ✅ react
    channel.send("@here");
    channel.send(embed).then(sent => {
        sent.react("✅");
    });
};

const startHeadcount = async (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 1);
    const channel = tools.getChannel(msg.guild, args[0], "text", msg);

    if (!channel) {
        // if invalid text channel, return
        return false;
    }

    if (args.length === 1) {
        // if only channel argument is given, begin generic headcount
        sendGenericHeadcount(client, msg, channel);
    } else {
        // if template argument is given, check for template
        const template = await tools.getRaidTemplate(args[1], guildConfig, db, client, msg);
        if (!template) {
            // if template name does not exist, return
            return false;
        }
        // send regular headcount
        sendHeadcount(client, msg, channel, template);
    }
};

const headcountHelp = (client, p, msg, guildConfig) => {
    let existingNames = ``;
    for (const name of guildConfig.raidTemplateNames) {
        existingNames += existingNames === "" ? `${name}` : ` | ${name}`;
    }
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Raid Commands")
        .setDescription(`Start a headcount with a template using:
\`\`\`${p}hc <channel> <templateName>\`\`\`
or start a generic headcount using:
\`\`\`${p}hc <channel>\`\`\``)
        .addField("Existing Template Names", `${existingNames}`);
    msg.channel.send(embed);
};

module.exports.headcount = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 1);

    if (args.length === 0) {
        // send help if no args are used
        headcountHelp(client, p, msg, guildConfig);
    } else {
        // start headcount
        startHeadcount(client, p, msg, guildConfig, db);
    }
};