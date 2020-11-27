const tools = require("./tools")

module.exports.generalHelp = (p, msg, client) => {
    const embed = tools.getStandardEmbed(client)
            .setTitle("Iris Bot Commands")
            .addFields(
                {name: "Server Configuration", value: `\`\`\`${p}config\`\`\``},
                {name: "Raid Manager", value: `\`\`\`${p}raid\`\`\``},
                {name: "User Verification", value: `\`\`\`${p}verification\`\`\``},
                {name: "Realm-Related", value: `\`\`\`${p}realmEye\n${p}ppe\`\`\``},
            );
    msg.channel.send(embed);
};

module.exports.configHelp = (p, msg, client) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Configuration Commands")
        .setDescription("Commands to configure bot permissions and general settings for your server.")
        .addFields(
            {name: "Server Setup", value: `\`\`\`${p}config prefix\n${p}config admins\n${p}config mods\`\`\``},
            {name: "View Current Configuration", value: `\`\`\`${p}config list\`\`\``},
        );
    msg.channel.send(embed);
};

module.exports.verifyHelp = (p, msg, client) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Verification Commands")
        .setDescription("Commands to set up and use verification in your server.")
        .addFields(
            {name: "Verification Configuration", value: `\`\`\`${p}verification\`\`\``},
            {name: "List Existing Verification Templates", value: `\`\`\`${p}verification list\`\`\``},
            {name: "Verification Template Management", value: `\`\`\`${p}verification create\n${p}verification edit\n${p}verification delete\`\`\``},
            {name: "Verifying", value: `\`\`\`${p}verify\n${p}unverify\n${p}manualVerify\`\`\``},
        );
    msg.channel.send(embed);
};

module.exports.unverifyHelp = (p, msg, client) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Unverify")
        .setDescription(`Unverify a user that is verified in one of your server's verification templates using the following command:
\`\`\`${p}unverify <@userOruserId> <templateNameOR#verificationChannel>\`\`\``)
        .addField("View Verification Template Names", `To view this server's verification templates, use the \`${p}verification list\` command.`);
    msg.channel.send(embed);
};

module.exports.manualVerifyHelp = (p, msg, client) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Manual Verification")
        .setDescription(`Manually verify a user that is not in your guild or does not meet requirements using the following command:
\`\`\`${p}manualVerify <@userOruserId> <templateNameOR#verificationChannel>\`\`\``)
        .addField("View Verification Template Names", `To view this server's verification templates, use the \`${p}verification list\` command.`);
    msg.channel.send(embed);
};

module.exports.raidHelp = (p, msg, client) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Raid Commands")
        .setDescription("Commands to run raids in your server.")
        .addFields(
            {name: "Raid Configuration", value: `\`\`\`${p}raid config\n${p}raid shorthand\`\`\``},
            {name: "List Existing Raid Templates", value: `\`\`\`${p}raid list\`\`\``},
            {name: "Raid Template Management", value: `\`\`\`${p}raid create\n${p}raid edit\n${p}raid delete\`\`\``},
            {name: "Raiding", value: `\`\`\`${p}raid start\`\`\``},
            {name: "Headcount", value: `\`\`\`${p}hc\`\`\``},
        );
    msg.channel.send(embed);
};