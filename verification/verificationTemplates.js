const tools = require("../tools");
const verificationEdit = require("./verificationEdit");

const deleteTemplate = (templateName, guildConfig, db) => {
    let promises = [];
    const guildDoc = db.collection("guilds").doc(`${guildConfig.guildId}`);
    promises.push(guildDoc.collection("verificationTemplates").doc(`${templateName}`).delete());

    let updatedNames = [];
    for (const temp of guildConfig.verificationTemplateNames) {
        const listName = temp.split(" | ")[0].trim();
        if (listName.toLowerCase() != templateName.toLowerCase()) {
            updatedNames.push(temp);
        }
    }
    promises.push(guildDoc.update({
        "verificationTemplateNames": updatedNames,
    }));

    return Promise.all(promises);
};

const confirmTemplateDeleted = (client, templateName, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${templateName} Verification Template Was Deleted`);
    msg.edit(embed);
};

const cancelDeleteTemplate = (client, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Verification Template Delete Cancelled");
    msg.edit(embed);
};

const templateNotFound = (client, templateName, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`${templateName} Not Found`)
        .setDescription(`A verification template with the name ${templateName} could not be found in this server.`);
    msg.channel.send(embed);
};

const deleteVerificationTemplate = async (client, p, msg, guildConfig, db) => {
    const templateName = tools.getArgs(msg.content, p, 2)[0];
    const actualName = tools.verificationTemplateExists(templateName, guildConfig);
    // if (!actualName) {
    //     templateNotFound(client, templateName, msg);
    //     return false;
    // }

    const embed = tools.getStandardEmbed(client)
        .setTitle("Template Delete Confirmation")
        .setDescription(`Are you sure you would like to delete the ${actualName} verifcation template?
Reply with **yes** or **no**.`);
    return msg.channel.send(embed).then(m => {
        const messageListener =  res => {
            if (((res.channel === msg.channel) && (res.author.id === msg.author.id))) {
                client.removeListener("message", messageListener);
                res.delete();
                switch (res.content) {
                    case "y":
                    case "yes":
                        return deleteTemplate(actualName, guildConfig, db).then(() => {
                            return confirmTemplateDeleted(client, actualName, m);
                        }).catch(console.error);
                }
                return cancelDeleteTemplate(client, m);
            }
        };
        client.on("message", messageListener);
    }).catch(console.error);
};

const listVerificationTemplates = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 2);

    if (args.length === 0) {
        let embed = tools.getStandardEmbed(client)
            .setTitle("Existing Verification Templates")
            .setDescription(`To view details of a specific verification template, use:
\`${p}verification list <templateName>\`.`);
        const templateNames = guildConfig.verificationTemplateNames;
        let nameList = ``;
        for (const template of templateNames) {
            const tempName = template.split(" | ")[0].trim();
            nameList += nameList === "" ? `${tempName}` : ` | ${tempName}`;
        }
        nameList = nameList === "" ? "No verification templates" : nameList;
        embed = embed.addField("Existing Templates", `${nameList}`);
        msg.channel.send(embed);

    } else {
        const templateName = tools.verificationTemplateExists(args[0], guildConfig);
        
        const nameSplit = templateName.split(" ");
        const commandDisplayName = nameSplit.length > 1 ? `"${templateName}"` : `${templateName}`;

        return db.collection("guilds").doc(`${msg.guild.id}`).collection("verificationTemplates").doc(`${templateName}`).get().then(snapshot => {
            if (!snapshot.exists) {
                return false;
            }
            const template = snapshot.data();

            let embed = tools.getStandardEmbed(client)
                .setTitle(`${template.name} Verification Template`)
                .setDescription(`Your verification template settings are listed below.
You can use this template with \`${p}verify\` in ${tools.getChannelById(msg.guild, template.verificationChannel)}
To edit this template, use \`${p}verification edit ${commandDisplayName}\`
To delete this template, use \`${p}verification delete ${commandDisplayName}\``);
            embed = embed.addFields(
                {name: "--------------------------------------------------------------------------------------------------",
                    value: `-----------------------------------------------------------------------------------------------`},
                {name: "Name", value: `${template.name}`},
                {name: "--------------------------------------------------------------------------------------------------",
                    value: `-----------------------------------------------------------------------------------------------`},
                {name: "Verification Channel", value: `${tools.getChannelById(msg.guild, template.verificationChannel)}`, inline: true},
                {name: "Verification Log Channel", value: `${tools.getChannelById(msg.guild, template.logChannel)}`, inline: true},
                );
            if (template.guildType) {
                embed = embed.addFields(
                    {name: "--------------------------------------------------------------------------------------------------",
                        value: `-----------------------------------------------------------------------------------------------`},
                    {name: "Assign Guild Roles?", value: `${template.guildRoles}`, inline: true},
                    {name: "Founder Role", value: `${tools.getRoleById(msg.guild, template.founderRole)}`, inline: true},
                    {name: "Leader Role", value: `${tools.getRoleById(msg.guild, template.leaderRole)}`, inline: true},
                    {name: "Officer Role", value: `${tools.getRoleById(msg.guild, template.officerRole)}`, inline: true},
                    {name: "Member Role", value: `${tools.getRoleById(msg.guild, template.memberRole)}`, inline: true},
                    {name: "Initiate Role", value: `${tools.getRoleById(msg.guild, template.initiateRole)}`, inline: true},
                );
            }
            embed = embed.addFields(
                {name: "--------------------------------------------------------------------------------------------------",
                    value: `-----------------------------------------------------------------------------------------------`},
                {name: "Assign Verified Role?", value: `${template.verifiedRole ? true : false}`, inline: true},
                {name: "Verified Role", value: `${tools.getRoleById(msg.guild, template.verifiedRole)}`, inline: true},
                {name: "--------------------------------------------------------------------------------------------------",
                    value: `-----------------------------------------------------------------------------------------------`},
                {name: "Fame", value: `${template.fame}`, inline: true},
                {name: "6/8s", value: `${template.sixEight}`, inline: true},
                {name: "6/8 Melees", value: `${template.sixEightMelee}`, inline: true},
                {name: "Rank", value: `${template.rank}`, inline: true},
                {name: "8/8s", value: `${template.eightEight}`, inline: true},
                {name: "8/8 Melees", value: `${template.eightEightMelee}`, inline: true},
                {name: "--------------------------------------------------------------------------------------------------",
                    value: `-----------------------------------------------------------------------------------------------`},
                {name: "Require Hidden Location?", value: `${template.hidden}`},
            );
            msg.channel.send(embed);
        }).catch(console.error);
    }
};

const verificationEditHelp = (client, p, msg, guildConfig) => {
    const templateNames = guildConfig.verificationTemplateNames;
    let nameList = ``;
    for (const template of templateNames) {
        const tempName = template.split(" | ")[0].trim();
        nameList += nameList === "" ? `${tempName}` : ` | ${tempName}`;
    }
    nameList = nameList === "" ? "No verification templates" : nameList;

    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Verification Commands")
        .setDescription(`Edit an exiting verifcation template using:
\`\`\`${p}verifcation edit <templateName>\`\`\``)
        .addField("Existing Template Names", `${nameList}`);
    msg.channel.send(embed);
};

const verificationDeleteHelp = (client, p, msg, guildConfig) => {
    const templateNames = guildConfig.verificationTemplateNames;
    let nameList = ``;
    for (const template of templateNames) {
        const tempName = template.split(" | ")[0].trim();
        nameList += nameList === "" ? `${tempName}` : ` | ${tempName}`;
    }
    nameList = nameList === "" ? "No verification templates" : nameList;

    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Verification Commands")
        .setDescription(`Delete an exiting verification template using:
    \`\`\`${p}verification delete <templateName>\`\`\``)
        .addField("Existing Template Names", `${nameList}`);
    msg.channel.send(embed);
};

module.exports.verificationConfig = (client, p, msg, guildConfig, db) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length < 1) {
        return false;
    }
    const command = args[0].toLowerCase();

    switch (command) {
        case "list":
        case "create":
        case "edit":
        case "delete":
            break;
        default:
            const fullCommand = `${p}verification ${args[0]}`;
            msg.reply(`"${fullCommand}" is not a valid command!`);
            return false;
    }

    if (args.length > 1) {
        if ((command === "create") && (tools.verificationTemplateExists(args[1], guildConfig))) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Verification Template Already Exists")
                .setDescription(`There is already a verification template named **${args[1]}** in this server. If you would like to edit it, use:
\`\`\`${p}verification edit ${args[1]}\`\`\`
Otherwise, please enter a unique verification template name.`);
            msg.channel.send(embed);
            return false;

        } else if ((command != "create") && (!tools.verificationTemplateExists(args[1], guildConfig))) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Verification Template Does Not Exist")
                .setDescription(`There is no verification template named **${args[1]}** in this server.`);
            msg.channel.send(embed);
            return false;
        }
    }

    switch (command) {
        case "list":
            listVerificationTemplates(client, p, msg, guildConfig, db);
            break;
        case "create":
            verificationEdit.editVerificationTemplate(client, p, msg, guildConfig, db, true);
            break;
        case "edit":
            if (args.length < 2) {
                verificationEditHelp(client, p, msg, guildConfig);
            } else {
                verificationEdit.editVerificationTemplate(client, p, msg, guildConfig, db);
            }
            break;
        case "delete":
            if (args.length < 2) {
                verificationDeleteHelp(client, p, msg, guildConfig);
            } else {
                deleteVerificationTemplate(client, p, msg, guildConfig, db);
            }
            break;
    }
};