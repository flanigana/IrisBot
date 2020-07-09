const tools = require("../tools");

const leftUndefined = template => {
    if (!template.name) {
        return true;
    } else if (!template.verificationChannel) {
        return true;
    } else if (template.guildType) {
        if (!template.guildName) {
            return true;
        }
    } else {
        return false;
    }
};

const displayCancelledPage = (client, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`Verification Template Was Cancelled`);
    msg.edit(embed);
};

const displayStartPage = (client, msg, pageInfo, first=false) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle(`Verification Template`)
        .setDescription(`In order to complete the verification template, you will need to respond to each parameter.
To do this, simply type a response in this channel whenever prompted.
\nTo switch setup pages, use the ⬅ and ➡ reactions.
To cancel this command at any time, react with ❌.
**Doing this will discard all progress and/or changes.**
\nTo begin, react with ➡.`)
        .addField("Note", `This setup will time out after remaining on the same page for 5 minutes.`)
        .setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    if (first) {
        return embed;
    }
    msg.edit(embed);
};

const displayNamePage = (client, p, template, guildConfig, msg, attemptedRes, pageInfo, alreadyExists) => {
    let existingNames = "";
    for (const listing of guildConfig.verificationTemplateNames) {
        const name = listing.split(" | ")[0].trim();
        existingNames += existingNames === "" ? `${name}` : ` | ${name}`;
    }
    existingNames = existingNames != "" ? existingNames : "No existing verification template names.";

    let embed = tools.getStandardEmbed(client)
        .setTitle("Verification Template Name")
        .setDescription(`Respond with the name you would like to use for this verification template. It cannot be the same name as an existing template.
If you would like to edit an existing template, use the \`${p}verification edit <templateName>\` command.
\n**Note:** If you wish to include spaces in your template name, the entire name must be enclosed in quotes when using it (ie "Template Name")!`)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Name", value: template.name, inline: true},
            {name: "Existing Names", value: existingNames, inline: true}
            );

    if (alreadyExists) {
        embed = embed.addField("Invalid Input", `${attemptedRes} already exists as a template name! Please respond with a new name that does not already exist or use the template editing command to update it.`);
    }

    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processName = (client, p, template, guildConfig, pageInfo, msg, res) => {
    let exists = false;
    if (res) {
        const arg = tools.getArgs(res)[0];
        exists = tools.verificationTemplateExists(arg, guildConfig);
        if (!exists) {
            template.name = arg;
        }
    }

    displayNamePage(client, p, template, guildConfig, msg, res, pageInfo, exists);
};

const displayChannelsPage = (client, p, template, guildConfig, msg, attemptedRes, pageInfo, status) => {
    let usedChannels = "";
    for (const listing of guildConfig.verificationTemplateNames) {
        const channelId = listing.split(" | ")[1].trim();
        const name = tools.getChannelById(msg.guild, channelId, "text");
        usedChannels += usedChannels === "" ? `${name}` : ` | ${name}`;
    }
    usedChannels = usedChannels != "" ? usedChannels : "No used channels.";

    let embed = tools.getStandardEmbed(client)
        .setTitle(`${template.name} Verification and Log Channels`)
        .setDescription(`Respond with the channels you would like to use for this verification template. The verification channel cannot be the same as an existing template.
This verification channel will be the channel that users will put their ${p}verify message in to begin verification.
The log channel will be the channel that will be notified when new users verify through this method.
\nTo change these, reply with one channel to use it as both the verification and the log channel, such as \`channelName\` or reply with two channels to use them respectively as the verification channel and log channel, such as \`verificationChannel logChannel\``)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Verification Channel", value: template.verificationChannel, inline: true},
            {name: "Log Channel", value: template.logChannel, inline: true},
            {name: "Used Channels", value: usedChannels}
            );

    if (status === "used") {
        embed = embed.addField("Invalid Input!", `${attemptedRes} is already being used for a verification template! Please respond with a new channel that is not being used or use the template editing command to update an existing template.`);
    } else if (status === "invalid") {
        embed = embed.addField("Invalid Input!", `${attemptedRes} is an invalid text channel! Please respond with a valid text channel that is not being used by another template.`);
    }
    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processChannels = (client, p, template, guildConfig, pageInfo, msg, res) => {
    let status = "valid";
    if (res) {
        const args = tools.getArgs(res);
        if (args.length > 0) {
            const verificationChannel = tools.getChannel(msg.guild, args[0], "text");
            if (verificationChannel) {
                if (!tools.verificationChannelUsed(verificationChannel.id, guildConfig)) {
                    template.verificationChannel = verificationChannel;
                    template.logChannel = verificationChannel;
                    if (args.length > 1) {
                        const logChannel = tools.getChannel(msg.guild, args[1], "text");
                        if (logChannel) {
                            template.logChannel = logChannel;
                        }
                    }
                } else {
                    status = "used";
                }
            } else {
                status = "invalid";
            }
            
        }
        displayChannelsPage(client, p, template, guildConfig, msg, args[0], pageInfo, status);

    } else {
        displayChannelsPage(client, p, template, guildConfig, msg, res, pageInfo, status);
    }
};

const displayTypePage = (client, template, msg, pageInfo) => {
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${template.name} Type`)
        .setDescription(`Will this verification template be used to verify members of a guild? If so, respond with \`true\` otherwise respond with \`false\`.`)
        .addField("Guild Type?", template.guildType)
        .setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processType = (client, template, pageInfo, msg, res) => {
    if (res) {
        const args = tools.getArgs(res);
        if (args.length > 0) {
            if (typeof args[0] === "boolean") {
                template.guildType = args[0];
            }
        }
    }

    displayTypePage(client, template, msg, pageInfo);
};

const displayGuildNamePage = (client, template, msg, pageInfo, valid, attemptedRes) => {
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${template.name} Guild Name`)
        .setDescription(`Respond with the name of the guild you are using to verify.`)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Guild Name", value: template.guildName},
            );

    if (!valid) {
        embed = embed.addField("Guild Not Found", `${attemptedRes} could not be found as a guild on RealmEye. Please try entering a valid guild name.`);
    }

    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processGuildName = async (client, template, pageInfo, msg, res) => {
    let valid = true;
    if (res) {
        const guildRealmEye = await tools.getRealmEyeGuildInfo(res);
        if (guildRealmEye.exists) {
            template.guildName = guildRealmEye.name;
        } else {
            valid = false;
        }
    }
    
    displayGuildNamePage(client, template, msg, pageInfo, valid, res);
};

const displayGuildRolesPage = (client, template, msg, pageInfo, error) => {
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${template.name} Guild Roles`)
        .setDescription(`If you would like to assign roles based on guild ranks, respond with the roles to assign to each rank, for example \`\`\`<founderRole> <leaderRole> <officerRole> <memberRole> <initiateRole>\`\`\`
If you do not want to assign roles based on guild ranks, just make sure that the Assign Guild Roles field shows "false" or respond with \`false\` to set it to such.
\n**Note:** All roles must be assigned in a single message.`)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Assign Guild Roles?", value: template.guildRoles, inline: true},
            {name: "Founder Role", value: template.founderRole, inline: true},
            {name: "Leader Role", value: template.leaderRole, inline: true},
            {name: "Officer Role", value: template.officerRole, inline: true},
            {name: "Member Role", value: template.memberRole, inline: true},
            {name: "Initiate Role", value: template.initiateRole, inline: true},
            );

    if (error) {
        embed = embed.addField("Invalid Input", `Either one of the attempted roles is invalid or not all 5 were assigned at once. Please try again.
\nIf attempting to deactivate role assignment by guild rank, simply reply with only \`false\``);
    }

    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processGuildRoles = (client, template, pageInfo, msg, res) => {
    let error = false;
    if (res) {
        const args = tools.getArgs(res);
        if (args.length >= 5) {
            const founder = tools.getRole(msg.guild, args[0]);
            const leader = tools.getRole(msg.guild, args[1]);
            const officer = tools.getRole(msg.guild, args[2]);
            const member = tools.getRole(msg.guild, args[3]);
            const initiate = tools.getRole(msg.guild, args[4]);

            if (founder && leader && officer && member && initiate) {
                template.guildRoles = true;
                template.founderRole = founder;
                template.leaderRole = leader;
                template.officerRole = officer;
                template.memberRole = member;
                template.initiateRole = initiate;
            } else {
                error = true;
            }

        } else if (args.length === 1 && typeof args[0] === "boolean" && !args[0]) {
            template.guildRoles = false;
            template.founderRole = undefined;
            template.leaderRole = undefined;
            template.officerRole = undefined;
            template.memberRole = undefined;
            template.initiateRole = undefined;
        } else {
            error = true;
        }
    }
    
    displayGuildRolesPage(client, template, msg, pageInfo, error);
};

const displayVerifiedRolePage = (client, template, msg, pageInfo, error) => {
    const giveRoles = template.verifiedRole ? true : false;
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${template.name} Verified Role`)
        .setDescription(`If you would like to assign a role for all who verify, respond with the role you would like to assign, for example \`\`\`<verifiedRole>\`\`\`
If you do not want to assign a role upon verification, just make sure that the Assign Verified Role field shows "false" or respond with \`false\` to set it to such.`)
        .addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Assign Verified Role?", value: giveRoles, inline: true},
            {name: "Verified Role", value: template.verifiedRole, inline: true},
            );

    if (error) {
        embed = embed.addField("Invalid Input", `The attempted role is invalid. Please try again.
\nIf attempting to deactivate role assignment, simply reply with only \`false\``);
    }

    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processVerifiedRole = (client, template, pageInfo, msg, res) => {
    let err = false;
    if (res) {
        const args = tools.getArgs(res);
        if (typeof args[0] === "boolean") {
            if (!args[0]) {
                template.verifiedRole = undefined;
            }
        } else {
            const verifiedRole = tools.getRole(msg.guild, args[0]);
            if (verifiedRole) {
                template.verifiedRole = verifiedRole;
            } else {
                err = true;
            }
        }
    }
    
    displayVerifiedRolePage(client, template, msg, pageInfo, err);
};

const displayRequirementsPage = (client, template, msg, pageInfo, error) => {
    let embed = tools.getStandardEmbed(client)
    .setTitle(`${template.name} Requirements`)
    .setDescription(`Please respond with the requirements you would like to set for the verification template with the following format:
\`\`\`<fame> <rank> <numOf6/8s> <numOf8/8s> <numOf6/8Melees> <numOf8/8Melees>\`\`\`
\n**Note:** Rank must be a number between 0 and 80.
\n**Note2:** An 8/8 character will also count as a 6/8 character if you only wish to check for 6/8s. If you would like 2 6/8s and 2 8/8s, a user will pass if they have 4 8/8s or 2 6/8s and 2 8/8s or anything in between.
\n**Note3:** There can only be a max of 16 6/8s+8/8s and a max of 3 6/8melees+8/8melees. If you set the total above that, the bot will fix the number to a valid value while prioritizing 8/8 requirements`)
    .addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Fame", value: template.fame, inline: true},
        {name: "6/8s", value: template.sixEight, inline: true},
        {name: "6/8 Melees", value: template.sixEightMelee, inline: true},
        {name: "Rank", value: template.rank, inline: true},
        {name: "8/8s", value: template.eightEight, inline: true},
        {name: "8/8 Melees", value: template.eightEightMelee, inline: true},
    );

    if (error) {
        embed = embed.addField("Invalid Input", `All requirements must be set at the same time. Please try again.`);
    }

    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processRequirements = (client, template, pageInfo, msg, res) => {
    const maxRank = 80;
    const maxChars = 16;
    const maxMelees = 3;
    let notAll = false;
    if (res) {
        let args = tools.getArgs(res);
        for (let i=0; i<args.length; i++) {
            args[i] = parseInt(args[i]);
            if (Number.isNaN(args[i]) || args[i] < 0) {
                args[i] = 0;
            }
        }

        if (args.length >= 6) {
            template.fame = args[0];
            // checks rank upper bound
            template.rank = args[1] < maxRank ? args[1] : maxRank;

            // check character bounds
            if ((args[2] + args[3]) <= maxChars) {
                template.sixEight = args[2];
                template.eightEight = args[3];
                
            } else {
                let eight = args[3] <= maxChars ? args[3] : maxChars;
                let six = maxChars - eight;
                six = six > 0 ? six : 0;

                template.sixEight = six;
                template.eightEight = eight;
            }

            // check melee bounds
            if ((args[4] + args[5]) <= maxMelees) {
                template.sixEightMelee = args[4];
                template.eightEightMelee = args[5];

            } else {
                let eight = args[5] <= maxMelees ? args[5] : maxMelees;
                let six = maxMelees - eight;
                six = six > 0 ? six : 0;
                
                template.sixEightMelee = six;
                template.eightEightMelee = eight;
            }

        } else {
            notAll = true;
        }
    }
    
    displayRequirementsPage(client, template, msg, pageInfo, notAll);
};

const displayDungeonsPage = (client, template, dungeons, msg, pageInfo, error) => {
    const requireDungeons = template.dungeons != "" ? true : false;
    const selectedDungeons = requireDungeons ? template.dungeons : "No dungeon requirements";
    let embed = tools.getStandardEmbed(client)
    .setTitle(`${template.name} Dungeon Requirements`)
    .setDescription(`Please respond with the dungeon requirements you would like to set for the verification template with the following format:
\`\`\`"dungeon name 1" count1 "dungeon name 2" count2 ...\`\`\`
Example:
\`\`\`voids 25 "cultist hideouts" 50 "ocean trenches" 20\`\`\`
Every first argument must be a valid dungeon name from the list below and every second argument must be number greater than 0
\nIf you would like to disable this feature, simply reply \`false\`.
\nThe list of available dungeons can be seen below. You must type them exactly as shown and surrounded by "".`)
    .addFields(
        {name: "Available Dungeons List", value: dungeons},
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Enforce Dungeon Requirements?", value: requireDungeons},
        {name: "Dungeon Requirements", value: selectedDungeons},
    );

    if (error) {
        embed = embed.addField("Invalid Input", `Invalid entry format. Response must either be \`false\` or be in the exact format detailed above.`);
    }

    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processDungeons = (client, template, dungeons, pageInfo, msg, res) => {
    let reset = false;
    if (res) {
        const args = tools.getArgs(res);
        if (typeof args[0] === "boolean") {
            if (!args[0]) {
                template.dungeons = "";
                reset = true;
            }

        } else {
            for (let i=0; i<args.length; i+=2) {
                const dungeon = args[i].toLowerCase();
                const num = parseInt(args[i+1]);

                // if every first argument is a valid dungeon name and every second argument is a number
                if (dungeons.includes(dungeon) && !Number.isNaN(num) && num > 0) {
                    // if a valid dungeon list has been entered (at least one valid pair), first reset the string to empty
                    if (!reset) {
                        template.dungeons = "";
                        reset = true;
                    }
                    template.dungeons += template.dungeons === "" ? `"${dungeon}" ${num}` : ` | "${dungeon}" ${num}`;
                }
            }
        }

    } else {
        reset = true;
    }

    displayDungeonsPage(client, template, dungeons, msg, pageInfo, !reset);
};

const displayLastSeenPage = (client, template, msg, pageInfo) => {
    let embed = tools.getStandardEmbed(client)
        .setTitle(`${template.name} Hidden Requirement`)
        .setDescription(`Do you want users to have their location set to hidden in order to verify? If so, respond with \`true\` otherwise respond with \`false\`.`)
        .addField("Require Hidden Location?", template.hidden)
        .setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const processLastSeen = (client, template, pageInfo, msg, res) => {
    if (res) {
        const args = tools.getArgs(res);
        if (args.length > 0) {
            if (typeof args[0] === "boolean") {
                template.hidden = args[0];
            }
        }
    }

    displayLastSeenPage(client, template, msg, pageInfo);
};

const displayEndPage = (client, p, template, msg, pageInfo, finished=false) => {
    const nameSplit = template.name.split(" ");
    const commandDisplayName = nameSplit.length > 1 ? `"${template.name}"` : `${template.name}`;
    const requireDungeons = template.dungeons != "" ? true : false;
    const selectedDungeons = requireDungeons ? template.dungeons : "No dungeon requirements";

    let embed = tools.getStandardEmbed(client);
    if (!finished) {
        let descriptionPiece;
        let completable = !leftUndefined(template);
        if (completable) {
            descriptionPiece = `If these are correct, react with ➡ to finalize this verification template.`;
        } else {
            descriptionPiece = `\n**One or more fields are still undefined! You cannot finish this setup until you have filled in the template's name and verification channel. If it is a guild verification template, the guild name must also be given.**`;
        }
        embed = embed.setTitle(`${template.name} Template ${completable ? `Completed` : `Unfinished`}`)
            .setDescription(`Your verification template settings are listed below.
${descriptionPiece}
\nTo change a setting, simply go back to the page by reacting with ⬅.
\nAfter finalizing this template, you can use it to verify using:
\`${p}verify\` in ${template.verificationChannel}`);
    } else {
        embed = embed.setTitle(`Verification Templates Updated`)
        .setDescription(`You can use this template with \`${p}verify\` in ${template.verificationChannel}
To edit this template, use \`${p}verification edit ${commandDisplayName}\`
To delete this template, use \`${p}verification delete ${commandDisplayName}\``);
    }
    embed = embed.addFields(
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Template Name", value: template.name},
        {name: "Verification Channel", value: template.verificationChannel, inline: true},
        {name: "Verification Log Channel", value: template.logChannel, inline: true},
        );
    if (template.guildType) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Guild Name", value: template.guildName},
            {name: "Assign Guild Roles?", value: template.guildRoles, inline: true},
            {name: "Founder Role", value: template.founderRole, inline: true},
            {name: "Leader Role", value: template.leaderRole, inline: true},
            {name: "Officer Role", value: template.officerRole, inline: true},
            {name: "Member Role", value: template.memberRole, inline: true},
            {name: "Initiate Role", value: template.initiateRole, inline: true},
        );
    }
    embed = embed.addFields(
        {name: "Assign Verified Role?", value: `${template.verifiedRole ? true : false}`, inline: true},
        {name: "Verified Role", value: template.verifiedRole, inline: true},
        {name: "--------------------------------------------------------------------------------------------------",
            value: `-----------------------------------------------------------------------------------------------`},
        {name: "Fame", value: template.fame, inline: true},
        {name: "6/8s", value: template.sixEight, inline: true},
        {name: "6/8 Melees", value: template.sixEightMelee, inline: true},
        {name: "Rank", value: template.rank, inline: true},
        {name: "8/8s", value: template.eightEight, inline: true},
        {name: "8/8 Melees", value: template.eightEightMelee, inline: true},
        {name: "Require Hidden Location?", value: template.hidden},
        {name: "Required Dungeons", value: selectedDungeons},
    );
    embed = embed.setFooter(`Iris Bot | Page ${pageInfo.currentPage+1} of ${pageInfo.pages.length}`, client.user.avatarURL());
    msg.edit(embed);
};

const updateCurrentPage = async (client, p, template, dungeons, guildConfig, pageInfo, msg, res) => {
    switch (pageInfo.pageName) {
        case "start":
            displayStartPage(client, msg, pageInfo);
            break;

        case "name":
            processName(client, p, template, guildConfig, pageInfo, msg, res);
            break;

        case "channels":
            processChannels(client, p, template, guildConfig, pageInfo, msg, res);
            break;

        case "type":
            processType(client, template, pageInfo, msg, res);
            break;
        
        case "guildName":
            processGuildName(client, template, pageInfo, msg, res);
            break;

        case "guildRoles":
            processGuildRoles(client, template, pageInfo, msg, res);
            break;

        case "verifiedRole":
            processVerifiedRole(client, template, pageInfo, msg, res);
            break;

        case "requirements":
            processRequirements(client, template, pageInfo, msg, res);
            break;

        case "dungeonRequirements":
            processDungeons(client, template, dungeons, pageInfo, msg, res);
            break;

        case "hidden":
            processLastSeen(client, template, pageInfo, msg, res);
            break;

        case "end":
            displayEndPage(client, p, template, msg, pageInfo, false);
            break;
    }

    return template;
};

const sendVerificationInstructions = (client, p, template) => {
    const requireDungeons = template.dungeons != "" ? true : false;
    const selectedDungeons = requireDungeons ? template.dungeons : "No dungeon requirements";

    let embed = tools.getStandardEmbed(client);
    embed = embed.setTitle(`Instructions to Verify in this Channel`)
        .setDescription(`In order to begin verification in this channel type \`${p}verify\`.
\nIf you have not yet verified with Iris Bot, you will first be sent instructions in your DMs to verify your realm IGN through RealmEye.
If you have already verified your IGN, your account stats from RealmEye will be checked to see if they meet the requirements listed below.`);

    if (template.guildType) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Required Guild Membership", value: `Must be a member of **${template.guildName}**`}
        );
    }

    embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Fame", value: template.fame, inline: true},
            {name: "6/8s", value: template.sixEight, inline: true},
            {name: "6/8 Melees", value: template.sixEightMelee, inline: true},
            {name: "Rank", value: template.rank, inline: true},
            {name: "8/8s", value: template.eightEight, inline: true},
            {name: "8/8 Melees", value: template.eightEightMelee, inline: true},
    );

    if (template.hidden) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Hidden Location Required", value: `You must set your "Who can see my last known location?" setting to private on RealmEye.`},
        );
    }

    if (requireDungeons) {
        embed = embed.addFields(
            {name: "--------------------------------------------------------------------------------------------------",
                value: `-----------------------------------------------------------------------------------------------`},
            {name: "Required Dungeons", value: selectedDungeons},
        );
    }

    template.verificationChannel.send(embed);
};

const updateTemplateDatabase = async (template, guildConfig, newTemplate, msg, db) => {
    const guildDoc = db.collection("guilds").doc(msg.guild.id);
    const templateDoc = guildDoc.collection("verificationTemplates").doc(`${template.name}`);

    /**
     * sets all guild values to undefined in case they were set during setup, but then the type was changed to a non-guild type.
     * this is to allow the user to swtich between guild and non-guild type during setup without having to fill in the fields again.
     * the fields are set to undefined if the the type is non-guild to create a clear database and make it obvious of type when reading data.
     *  */
    if (!template.guildType) {
        template.guildName = undefined;
        template.guildRoles = false;
        template.founderRole = undefined;
        template.leaderRole = undefined;
        template.officerRole = undefined;
        template.memberRole = undefined;
        template.initiateRole = undefined;
    }

    let promises = [];
    promises.push(templateDoc.set({
        "name": template.name,
        "verificationChannel": template.verificationChannel.id,
        "logChannel": template.logChannel.id,
        "guildType": template.guildType,
        "guildName": template.guildName ? template.guildName : null,
        "guildRoles": template.guildRoles,
        "founderRole": template.founderRole ? template.founderRole.id : null,
        "leaderRole": template.leaderRole ? template.leaderRole.id : null,
        "officerRole": template.officerRole ? template.officerRole.id : null,
        "memberRole":  template.memberRole ? template.memberRole.id : null,
        "initiateRole":  template.initiateRole ? template.initiateRole.id : null,
        "verifiedRole":  template.verifiedRole ? template.verifiedRole.id : null,
        "fame": template.fame,
        "rank": template.rank,
        "sixEight": template.sixEight,
        "eightEight": template.eightEight,
        "sixEightMelee": template.sixEightMelee,
        "eightEightMelee": template.eightEightMelee,
        "dungeons": template.dungeons,
        "hidden": template.hidden,
        "verified": template.verified,
    }));

    // updates the template names and corresponding verification channels in the guild db entry
    const existingTemplates = guildConfig.verificationTemplateNames;
    let newTemplates = [];
    if (!newTemplate) {
        for (const temp of existingTemplates) {
            const listName = temp.split(" | ")[0].trim();
            if (listName.toLowerCase() != template.name.toLowerCase()) {
                newTemplates.push(temp);
            } else {
                const newTemp = `${template.name} | ${template.verificationChannel.id}`;
                newTemplates.push(newTemp);
            }
        }
    } else if (existingTemplates.length > 0) {
        newTemplates = existingTemplates.slice();
        const newTemp = `${template.name} | ${template.verificationChannel.id}`;
        newTemplates.push(newTemp);
    } else {
        const newTemp = `${template.name} | ${template.verificationChannel.id}`;
        newTemplates.push(newTemp);
    }
    
    promises.push(guildDoc.update({
        "guildName": msg.guild.name,
        "verificationTemplateNames": newTemplates,
    }));

    return Promise.all(promises);
};

const updatePagesList = (template, newTemplate) => {
    let pages = ["start"];
    if (newTemplate) {
        pages.push("name");
    }
    pages.push("channels");
    pages.push("type");
    if (template.guildType) {
        pages.push("guildName");
        pages.push("guildRoles");
    }
    pages.push("verifiedRole");
    pages.push("requirements");
    pages.push("dungeonRequirements");
    pages.push("hidden");
    pages.push("end");
    return pages;
};

const processCollection = (client, p, msg, collector, reaction, newTemplate, template, dungeons, guildConfig, pageInfo, m, db) => {
    pageInfo.pages = updatePagesList(template, newTemplate);
    if (reaction.emoji.name === "❌") {
        // cancel
        displayCancelledPage(client, m);
        collector.stop();
    } else if (reaction.emoji.name === "⬅") {
        collector.resetTimer();
        // go back page
        if (pageInfo.currentPage > 0) {
            pageInfo.currentPage = pageInfo.currentPage - 1;
            pageInfo.pageName = pageInfo.pages[pageInfo.currentPage];
        }
        updateCurrentPage(client, p, template, dungeons, guildConfig, pageInfo, m);
    } else if (reaction.emoji.name === "➡") {
        collector.resetTimer();
        // go forward page
        if (pageInfo.currentPage < pageInfo.pages.length-1) {
            pageInfo.currentPage = pageInfo.currentPage + 1;
            pageInfo.pageName = pageInfo.pages[pageInfo.currentPage];
            updateCurrentPage(client, p, template, dungeons, guildConfig, pageInfo, m);
        } else {
            // finish
            if (!leftUndefined(template)) {
                updateTemplateDatabase(template, guildConfig, newTemplate, msg, db).then(() => {
                    displayEndPage(client, p, template, m, pageInfo, true);
                    sendVerificationInstructions(client, p, template);
                });
                collector.stop();
            }
        }
    }
};

const getTemplateData = async (client, p, msg, guildConfig, db, newTemplate) => {
    let verificationTemplate;
    const templateName = tools.getArgs(msg.content, p, 2)[0];
    if (!newTemplate) {
        verificationTemplate = await tools.getVerificationTemplate(client, msg, templateName, guildConfig, db);
    } else {
        verificationTemplate = {
            name: templateName,
            verificationChannel: undefined,
            logChannel: undefined,
            guildType: false,
            guildName: undefined,
            guildRoles: false,
            founderRole: undefined,
            leaderRole: undefined,
            officerRole: undefined,
            memberRole: undefined,
            initiateRole: undefined,
            verifiedRole: undefined,
            fame: 0,
            rank: 0,
            sixEight: 0,
            eightEight: 0,
            sixEightMelee: 0,
            eightEightMelee: 0,
            dungeons: "",
            hidden: false,
            verified: [],
        };
    }
    return verificationTemplate;
};

module.exports.editVerificationTemplate = async (client, p, msg, guildConfig, db, newTemplate=false) => {
    let template = await getTemplateData(client, p, msg, guildConfig, db, newTemplate);
    let dungeons = await tools.getRealmEyeDungeonsList();

    let pages = updatePagesList(template, newTemplate);
    let pageInfo = {
        pages: pages,
        currentPage: 0,
        pageName: pages[0],
    };

    const embed = displayStartPage(client, msg, pageInfo, true);
    const reactionsList = ["⬅", "➡", "❌"];
    const reactionFilter = (reaction, user) => ((user.id === msg.author.id) && (reactionsList.includes(reaction.emoji.name)));

    msg.channel.send(embed).then(m => {

        // used to get user responses and update
        const messageListener =  async res => {
            if (((res.channel === msg.channel) && (res.author.id === msg.author.id))) {
                // update info
                template = await updateCurrentPage(client, p, template, dungeons, guildConfig, pageInfo, m, res.content);
                res.delete();
            }
        };
        client.on("message", messageListener);

        const collector = m.createReactionCollector(reactionFilter, {time: 300000});
        collector.on("collect", reaction => {
            processCollection(client, p, msg, collector, reaction, newTemplate, template, dungeons, guildConfig, pageInfo, m, db);
        });

        collector.on("end", collected => {
            m.reactions.removeAll().catch(console.error);
            client.removeListener("message", messageListener);
        });

        // add initial reactions
        for (const reaction of reactionsList) {
            m.react(reaction);
        }

    }).catch(console.error);
};