const Discord = require("discord.js");

/////////////////////////////////////////////////////////////////////
//**                           General                             */
/////////////////////////////////////////////////////////////////////

module.exports.getStandardEmbed = client => {
    return new Discord.MessageEmbed()
    .setColor("#7542d4")
    .setFooter("Iris Bot", client.user.avatarURL())
    .setTimestamp();
};

module.exports.getUserIgn = async (id, db) => {
    return db.collection("users").doc(id).get().then(snapshot => {
        if (!snapshot.exists) {
            return null;
        }

        const userData = snapshot.data();
        if (!userData.ign) {
            return null;
        }

        return userData.ign;
    }).catch(console.error);
};


/////////////////////////////////////////////////////////////////////
//**                            Server                             */
/////////////////////////////////////////////////////////////////////

module.exports.getGuildById = (client, id) => {
    return client.guilds.cache.find(guild => guild.id === id);
};

module.exports.getGuildConfig = async (id, db, msg) => {
    const doc = db.collection("guilds").doc(id);
    return doc.get().then(snapshot => {
        if (!snapshot.exists) {
            if (msg) {
                msg.channel.send("Server data not found! You may need to kick the bot from the server and re-invite it in order for it to work. If it continues not to function, contact the bot owner.");
            }
            return undefined;
        }
        return snapshot.data();
    }).catch(console.error);
};


/////////////////////////////////////////////////////////////////////
//**                      Channels and Roles                       */
/////////////////////////////////////////////////////////////////////

module.exports.getChannelById = (guild, id, msg) => {
    let channel = guild.channels.cache.find(channel => channel.id === id);
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel with id **${id}**...`);
        } else {
            console.log(`Trouble finding channel with id ${id}...`);
        }
        channel = undefined;
    }
    return channel;
};

module.exports.getChannelByName = (guild, name, type, msg) => {
    let channel = guild.channels.cache.find(channel => ((channel.name.toLowerCase() === name.toLowerCase()) && (channel.type === type)));
    if (!channel) {
        if (msg) {
            msg.reply(`Trouble finding channel named **${name}**...`);
        }
        channel = undefined;
    }
    return channel;
};

module.exports.getRoleById = (guild, id, msg) => {
    let role = guild.roles.cache.find(role => role.id === id);
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role with id **${id}**...`);
        } else {
            console.log(`Trouble finding role with id ${id}...`);
        }
        role = undefined;
    }
    return role;
};

module.exports.getRoleByName = (guild, name, msg) => {
    let role = guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
    if (!role) {
        if (msg) {
            msg.reply(`Trouble finding role named **${name}**...`);
        }
        role = undefined;
    }
    return role;
};

module.exports.getChannel = (guild, channelString, type, msg) => {
    let channel;
    if (typeof channelString != "string") {
        console.error("Invalid type for channel. Expected string.");

    } else {
        if (channelString.startsWith("<#") && channelString.endsWith(">")) {
            channel = this.getChannelById(guild, channelString.slice(2, channelString.length-1));
        } else if ((channelString.startsWith("\"") && channelString.endsWith("\"")) || (channelString.startsWith("\'") && channelString.endsWith("\'"))) {
            channel = this.getChannelByName(guild, channelString.slice(1, channelString.length-1), type, msg);
        } else if (channelString.endsWith(","))  {
            channel = this.getChannelByName(guild, channelString.slice(0, channelString.length-1), type, msg);
        } else {
            channel = this.getChannelByName(guild, channelString, type, msg);
        }
    }
    return channel;
};

module.exports.getRole = (guild, roleString, msg) => {
    let role;
    if (typeof roleString != "string") {
        console.error("Invalid type for role. Expected string.");

    } else {
        if (roleString.startsWith("<@&") && roleString.endsWith(">")) {
            role = this.getRoleById(guild, roleString.substring(3, roleString.length-1));
        } else if ((roleString.startsWith("\"") && roleString.endsWith("\"")) || (roleString.startsWith("\'") && roleString.endsWith("\'"))) {
            role = this.getRoleByName(guild, roleString.substring(1, roleString.length-1), msg);
        } else if (roleString.endsWith(","))  {
            role = this.getRoleByName(guild, roleString.substring(0, roleString.length-1), msg);
        } else {
            role = this.getRoleByName(guild, roleString, msg);
        }
    }
    return role;
};

module.exports.isAdmin = (guildMember, guildConfig) => {
    if (guildMember.user.id === guildConfig.guildOwner || guildMember.user.id === "225044370930401280") {
        return true;
    } else if (guildMember.hasPermission("ADMINISTRATOR")) {
        return true;
    }

    const admins = guildConfig.admins;
    for (const role of admins) {
        if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
            return true;
        }
    }
    return false;
};

module.exports.isMod = (guildMember, guildConfig) => {
    const mod = this.isAdmin(guildMember, guildConfig);

    if (!mod) {
        const mods = guildConfig.mods;
        for (const role of mods) {
            if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
                return true;
            }
        }
        return false;
    } else {
        return true;
    }
};

module.exports.isRaidLeader = (guildMember, guildConfig) => {
    const raidLeaderRoles = guildConfig.raidLeaderRoles;
    for (const roleId of raidLeaderRoles) {
        if (guildMember.roles.cache.find(memberRole => memberRole.id === roleId)) {
            return true;
        }
    }
    return false;
};

/////////////////////////////////////////////////////////////////////
//**                       Command Tools                           */
/////////////////////////////////////////////////////////////////////

module.exports.getPrefix = async (guildId, db) => {
    return db.collection("guilds").doc(guildId).get().then(snapshot => {
        if (snapshot.exists) {
            const guildConfig = snapshot.data();
            return guildConfig.prefix;
        } else {
            return "!";
        }
    }).catch(console.error);
};

module.exports.getArgs = (fullCommand, p, commandsLength=0) => {
    if (p) {
        fullCommand = fullCommand.substring(p.length);
    }
    const split = fullCommand.split(" ");
    let allArgs = [];
    let openString = false;
    let opener = ``;
    let combinedArg = ``;
    for (let i=0; i<split.length; i++) {
        let curr = split[i].trim();
        if (curr != "") {
            if (curr.endsWith(",")) {
                // allows comma-separated args
                curr = curr.substring(0, curr.length-1);
            }
            if (openString) {
                // if a "long arg" formatted string is open
                if (curr.endsWith(opener)) {
                    // checks for ending of long arg such as ' arg" '
                    openString = false;
                    combinedArg += ` ${curr.substring(0, curr.length-1)}`;
                    allArgs.push(combinedArg);
                    combinedArg = ``;
                } else {
                    // add to current arg if it hasn't closed
                    combinedArg += ` ${curr}`;
                }

            } else if (curr.startsWith("\"") || curr.startsWith("\'")) {
                opener = curr.charAt(0);
                // if an arg is the beginning of a long are as "long arg"
                if (!curr.endsWith(opener)) {
                    // if the arg is not single arg surrounded by quotes of the same type such as "arg" or 'arg'
                    openString = true;
                    combinedArg = curr.substring(1);
                } else {
                    // resets opener if it is a single arg
                    opener = ``;
                    allArgs.push(curr.substring(1, curr.length-1));
                }
            } else if (curr.toLowerCase() === "true") {
                // converts true string to boolean
                allArgs.push(true);
                // convers false string to boolean
            } else if (curr.toLowerCase() === "false") {
                allArgs.push(false);
            } else {
                allArgs.push(curr);
            }
        }
    }
    if (combinedArg != "") {
        allArgs.push(combinedArg);
    }

    return allArgs.slice(commandsLength);
};


/////////////////////////////////////////////////////////////////////
//**                       Emoji Tools                             */
/////////////////////////////////////////////////////////////////////

module.exports.getGuildEmoji = (client, guildId, emojiName, trimEnds=false, frontTrim=0, backTrim=0) => {
    let emojiGuildIds = ["710578568211464192", "708761992705474680", "711504382394630194", "711491483588493313"];
    if (guildId) {
        emojiGuildIds.push(guildId);
    }
    if (trimEnds) {
        emojiName = emojiName.substring(frontTrim, emojiName.length-backTrim);
    }
    return client.emojis.cache.find(emoji => ((emoji.name === emojiName) && emojiGuildIds.includes(emoji.guild.id)));
};

module.exports.isUnicodeEmoji = (emoji) => {
    const emojiRanges = [
        '(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])' // U+1F680 to U+1F6FF
    ];
    if (emoji.match(emojiRanges.join('|'))) {
        return true;
    } else {
        return false;
    }
};

module.exports.getEmoji = (client, emojiName, guildId) => {
    if (this.isUnicodeEmoji(emojiName)) {
        return emojiName;
    } else if (emojiName.startsWith("<") && emojiName.endsWith(">")) {
        return this.getGuildEmoji(client, guildId, emojiName, true, 1, 1);
    } else {
        return this.getGuildEmoji(client, guildId, emojiName);
    }
};

module.exports.createClientEmojisList = (client, guild) => {
    let emojiGuildIds = ["710578568211464192", "708761992705474680", "711504382394630194", "711491483588493313"];
    let types = ["Portal", "Key", "Class", "Ability"];
    let typesLength = types.length;
    let emojisList = {};
    let guildLength = 0;

    client.emojis.cache.map(emoji => {
        for (let i=0; i<typesLength; i++) {
            if (emojiGuildIds.includes(emoji.guild.id) && emoji.name.endsWith(types[i].toLowerCase())) {
                if (emojisList[`${types[i]}`] === undefined) {
                    emojisList[`${types[i]}`] = `${emoji}`;
                } else {
                    emojisList[`${types[i]}`] += ` | ${emoji}`;
                }
            }
        }
        if (guild && (emoji.guild === guild)) {
            const emojiString = `${emoji}`;

            if (emojisList[`Guild_${guildLength}`] === undefined) {
                types.push(`Guild_${guildLength}`);
                emojisList[`Guild_${guildLength}`] = emojiString;

            } else if ((emojisList[`Guild_${guildLength}`].length + ` | ${emojiString}`.length) < 1024) {
                emojisList[`Guild_${guildLength}`] += ` | ${emojiString}`;

            } else {
                guildLength++;
                types.push(`Guild_${guildLength}`);
                emojisList[`Guild_${guildLength}`] = emojiString;
            }
        }
    });

    emojisList.types = types;

    return emojisList;
};