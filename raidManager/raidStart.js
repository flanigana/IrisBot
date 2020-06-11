const tools = require("../tools");
const raidTools = require("./raidTools");

const raidStatusUpdated = (client, status, raidMsg, raidStarter, raidName, destinationVc, emoji, reactsCount, min, raidLeaderCount, stoppedBy) => {
    let embed = tools.getStandardEmbed(client);
    switch (status) {
        case "started":
            embed = tools.getStandardEmbed(client)
                .setAuthor(`${raidName} successfully started by ${raidStarter.displayName} in ${destinationVc.name}.`, raidStarter.user.avatarURL())
                .setDescription(`The raid has started with ${raidLeaderCount} raid leaders and ${reactsCount} raiders.`);
            if (stoppedBy) {
                embed = embed.setFooter(`Raid check stopped early by ${stoppedBy.displayName}`);
            }
            break;
        case "failed":
            embed = embed.setAuthor(`${raidName} started by ${raidStarter.displayName} has failed.`, raidStarter.user.avatarURL())
                .setDescription(`Raid required ${min} ${emoji} reacts, but only got ${reactsCount}.`);
            if (stoppedBy) {
                embed = embed.setFooter(`Raid check stopped early by ${stoppedBy.displayName}`);
            }
            break;
        case "cancelled":
            embed = tools.getStandardEmbed(client)
                .setAuthor(`${raidName} started by ${raidStarter.displayName} has been cancelled.`, raidStarter.user.avatarURL())
                .setFooter(`Raid check cancelled by ${stoppedBy.displayName}`);
            break;
    }
    return raidMsg.edit(embed);
}

const endRaidStartReactionCollector = async (client, collected, cancelled, raidMsg, raidStarter, raidName, primaryEmoji, primaryMin, destinationVc, guildMembers, raiderCount, raidLeaderCount) => {
    let primaryReactsCount = 0;
    let passedMin = false;
    let stoppedBy = null;

    passedMin = true;
    collected.map(reaction => {
        if (!cancelled) {
            if (reaction.emoji.name === "✅") {
                reaction.users.cache.map(user => {
                    if (user.id != client.user.id) {
                        stoppedBy = guildMembers.find(mem => mem.id === user.id);
                    }
                });
            } else if (reaction.emoji === primaryEmoji) {
                primaryReactsCount = reaction.count - 1;
                if (primaryReactsCount < primaryMin) {
                    raidStatusUpdated(client, "failed", raidMsg, raidStarter, raidName, null, primaryEmoji, primaryReactsCount, primaryMin, null, stoppedBy);
                    passedMin = false;
                } else {
                    primaryReacts = reaction.users.cache;
                    return true;
                }
            }
        }

        if (reaction.emoji.name === "❌") {
            reaction.users.cache.map(user => {
                if (user.id != client.user.id) {
                    stoppedBy = guildMembers.find(mem => mem.id === user.id);
                }
            });
        }
    });

    if (cancelled) {
        raidStatusUpdated(client, "cancelled", raidMsg, raidStarter, raidName, null, null, null, null, null, stoppedBy);
        return false;
    }

    if (!passedMin) {
        return false;
    } else {
        raidStatusUpdated(client, "started", raidMsg, raidStarter, raidName, destinationVc, null, raiderCount, null, raidLeaderCount, stoppedBy);
        return true;
    }
}

const moveAfk = async (raiders, destinationVc) => {
    destinationVc.members.map(guildMember => {
        if (!raiders.has(guildMember)) {
            guildMember.voice.kick("Failed to react to raid check.");
        }
    })
}

const raidStartMessage = (client, raidStarter, raidName, raidDescription, destinationVc, remainingTime, raiderCount, raidLeaderCount) => {
    const minutes = Math.floor(remainingTime / (60*1000));
    const seconds = (remainingTime % (60*1000)) / 1000;
    const embed = tools.getStandardEmbed(client)
        .setAuthor(`${raidName} started by ${raidStarter.displayName} in ${destinationVc.name}.`, raidStarter.user.avatarURL())
        .setDescription(`${raidDescription}
\nThe raid currently has ${raidLeaderCount} raid leaders and ${raiderCount} raiders.`)
        .setFooter(`Time Remaining ${minutes} minutes ${seconds} seconds`);
    return embed;
}

const validVoiceChannels = (idleVc, destVc) => {
    if (!idleVc || !destVc) {
        return false;
    }
    if (idleVc.type != "voice") {
        return false;
    }
    if (destVc.type != "voice") {
        return false;
    }
    return true;
}

const checkRaidStartOptions = async (client, p, msg) => {
    const args = tools.getArgs(msg.content, p, 3);
    let argCheck = {
        passed: false,
        idleVc: undefined,
        destVc: undefined,
        alertChannel: msg.channel,
        runTime: (120*1000),
    }

    if (args.length < 2) {
        const embed = tools.getStandardEmbed(client)
            .setTitle("No Voice Channels")
            .setDescription("You must include the names of two valid voice channels in order to start a raid!")
            .addField("Example Usage", `\`${p}raid start <templateName> <idleVc> <destinationVc>\``);
        msg.channel.send(embed);
        return argCheck;
    } else {
        // at least 2 args were passed as channels
        argCheck.idleVc = tools.getChannel(msg.guild, args[0].trim(), "voice");
        argCheck.destVc = tools.getChannel(msg.guild, args[1].trim(), "voice");
        argCheck.passed = validVoiceChannels(argCheck.idleVc, argCheck.destVc);

        if (args.length > 2) {
            argCheck.alertChannel = tools.getChannel(msg.guild, args[2].trim(), "text");
            if (!argCheck.alertChannel) {
                const embed = tools.getStandardEmbed(client)
                    .setTitle("Invalid Alert Channel")
                    .setDescription(`**${args[2].trim()}** is an invalid text channel name.`);
                msg.channel.send(embed);
                argCheck.passed = false;
                return argCheck;
            }
        }
    }

    if (!argCheck.passed) {
        let embed = tools.getStandardEmbed(client)
            .setTitle("Invalid Voice Channels")
            .setDescription(`At least one of the given channel names were invalid as voice channels.
As a result, the raid check has been cancelled.`);
        if (!argCheck.idleVc) {
            embed = embed.addField("Invalid Voice Channel", `${args[0].trim()}`, true);
        }
        if (!argCheck.destVc) {
            embed = embed.addField("Invalid Voice Channel", `${args[1].trim()}`, true);
        }
        msg.channel.send(embed);
    }
    return argCheck;
}

const isNitroBooster = (guildMember, guildConfig) => {
    const boosterRoleId = guildConfig.boosterRole;
    if (guildMember.roles.cache.find(memberRole => memberRole.id === boosterRoleId)) {
        return true;
    }
    return false;
}

const confirmReaction = async (reaction, user) => {
    let confirmed = undefined;
    return user.send(`You reacted with ${reaction.emoji} for the raid. Please confirm by reacting with ✅ or react with ❌ to cancel.`).then(reactConfirm => {
        const reactionFilter = (reaction, user) => {
            if (!user.bot) {
                if (reaction.emoji.name === "✅" ||  reaction.emoji.name === "❌") {
                    return true;
                } else {
                    return false;
                }
            }
        }

        reactConfirm.react("✅");
        reactConfirm.react("❌");
        return reactConfirm.awaitReactions(reactionFilter, {max: 1, time: 60000}).then(collected => {
            collected.map(reaction => {
                if (reaction.emoji.name === "✅") {
                    confirmed = true;
                } else if (reaction.emoji.name === "❌") {
                    confirmed = false;
                }
            });
            return confirmed;
        })
    });
    
}

const createConfirmationEmbed = (client, destVc, location, secondaryEmojis, secondaryConfirms) => {
    let confirms = tools.getStandardEmbed(client)
        .setDescription("The following people have been confirmed for each seconary react.");
    
    if (location) {
        confirms = confirms.setTitle(`Raid Confirmations for "${destVc.name}" at ${location}`);
    } else {
        
        confirms = confirms.setTitle(`Raid Confirmations for "${destVc.name}"`);
    }

    for (let i=0; i<secondaryEmojis.length; i++) {
        let confirmedUsers = ``;
        for (user of secondaryConfirms[i]) {
            confirmedUsers += confirmedUsers === "" ? `${user}` : ` | ${user}`;
        }
        if (confirmedUsers === "") {
            confirmedUsers = "Waiting for confirmations..."
        }
        confirms = confirms.addField(`${secondaryEmojis[i]}'s Confirmed`, `${confirmedUsers}`);
    }
    return confirms;
}

/**
 * msg format: !raid start <templateName> <idleVc> <destVc> <alertChannel> <location>
 */
module.exports.startRaid = async (client, p, msg, guildConfig, db) => {
    const guildMembers = msg.guild.members.cache;
    const raidStarter = guildMembers.find(mem => mem.id === msg.author.id);
    if (!raidTools.isRaidLeader(raidStarter, guildConfig)) {
        return false;
    }

    const raidOptions = await checkRaidStartOptions(client, p, msg);
    if (!raidOptions.passed) {
        return false;
    }

    const idleVc = raidOptions.idleVc;
    const destinationVc = raidOptions.destVc;
    let confirmationChannel = null;
    if (guildConfig.sendConfirmations) {
        confirmationChannel = tools.getChannelById(msg.guild, guildConfig.confirmationChannel);
    }
    const runTime = guildConfig.defaultRunTimeSec * 1000;
    let remainingTime = runTime;

    const args = tools.getArgs(msg.content, p, 2);
    let location = null;
    if (args.length >= 5) {
        location = args[4];
    }
    const templateName = args[0];
    const raidTemplate = await tools.getRaidTemplate(templateName, guildConfig, db, client, msg);
    if (!raidTemplate) {return false;}

    const raidName = raidTemplate.name;
    const raidDescription = raidTools.formatRaidDescription(client, raidTemplate.description, msg.guild.id);
    
    const primaryEmoji = raidTools.formatPrimaryEmoji(client, raidTemplate, msg.guild.id);
    const primaryMin = raidTemplate.primaryMin;

    let secondaryEmojis = raidTools.formatSecondaryEmojis(client, raidTemplate, msg.guild.id);
    let secondaryLimits = raidTemplate.secondaryLimits;

    let emojiList = [];
    emojiList.push(primaryEmoji);
    for (emoji of secondaryEmojis) {
        emojiList.push(emoji);
    }
    for (listEmoji of raidTemplate.reacts) {
        const emoji = tools.getEmoji(client, listEmoji, msg.guild.id);
        emojiList.push(emoji);
    }

    const nitroEmoji = tools.getEmoji(client, "nitroboost", msg.guild.id);
    if (guildConfig.allowBooster) {
        emojiList.push(nitroEmoji);
    }

    emojiList.push("✅");
    emojiList.push("❌");

    const raiders = new Set();
    const raidLeaders = new Set();
    let raiderCount = 0;
    let raidLeaderCount = 0;

    let notifMessageContents = `@here \`${raidName}\` started by ${raidStarter.displayName} in ${destinationVc.name}! Join \`${idleVc.name}\` and react to join.`
    let notifMessage = null;
    raidOptions.alertChannel.send(notifMessageContents).then(m => {
        notifMessage = m;
    }).catch(console.error);

    let embed = raidStartMessage(client, raidStarter, raidName, raidDescription, destinationVc, remainingTime, raiderCount, raidLeaderCount);

    const raidStartReactionFilter = (reaction, user) => {
        const guildMember = guildMembers.find(mem => mem.id === user.id);
        if ((reaction.emoji.name === "✅" || reaction.emoji.name === "❌") && raidTools.isRaidLeader(guildMember, guildConfig)) {
            return true;
        } else if ((reaction.emoji === primaryEmoji) || (secondaryEmojis.includes(reaction.emoji))) {
            return true;
        } else if (guildConfig.allowBooster && isNitroBooster(guildMember, guildConfig) && (reaction.emoji === nitroEmoji)) {
            return true;
        } else {
            return false;
        }
    };
    
    let raidMsg = null;
    let interval = null;
    let secondaryConfirms = [];
    for (let i=0; i<secondaryEmojis.length; i++) {
        secondaryConfirms[i] = [];
    }

    raidOptions.alertChannel.send(embed).then(m => {
        let confirmations = createConfirmationEmbed(client, destinationVc, location, secondaryEmojis, secondaryConfirms);
        let confirmedMessage = null;
        confirmationChannel.send(confirmations).then(confirmed => {
            confirmedMessage = confirmed;
        });

        raidMsg = m;
        let cancelled = false;
        const collector = raidMsg.createReactionCollector(raidStartReactionFilter, {time: runTime});
        collector.on("collect", (reaction, user) => {
            if (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") {
                if (reaction.emoji.name === "❌") {
                    cancelled = true;
                }
                collector.stop();

            } else if (reaction.emoji === primaryEmoji) {
                if (!user.bot) {
                    const guildMember = guildMembers.find(mem => mem.id === user.id);
                    const voice = guildMember.voice;
                    if (raidTools.isRaidLeader(guildMember, guildConfig)) {
                        raidLeaders.add(guildMember);
                    }
                    if (voice.channel === idleVc) {
                        raiders.add(guildMember);
                        voice.setChannel(destinationVc);
                    }
                    
                }

            } else if (secondaryEmojis.includes(reaction.emoji)) {
                if (!user.bot) {
                    const secondaryIndex = secondaryEmojis.indexOf(reaction.emoji);
                    const reactionLimit = secondaryLimits[secondaryIndex];
                    confirmReaction(reaction, user).then(confirmed => {
                        if (confirmed && (secondaryConfirms[secondaryIndex].length < reactionLimit)) {
                            const guildMember = guildMembers.find(mem => mem.id === user.id);
                            secondaryConfirms[secondaryIndex].push(guildMember);
                            if (location) {
                                user.send(`You are now confirmed with ${reaction.emoji} for the raid. Please go to \`${location}\` with your ${reaction.emoji}.`);
                            } else {
                                user.send(`You are now confirmed with ${reaction.emoji} for the raid. Please go to location announced with your ${reaction.emoji}.`);
                            }
                            confirmedMessage.edit(createConfirmationEmbed(client, destinationVc, location, secondaryEmojis, secondaryConfirms));
                        } else if (confirmed) {
                            user.send(`The raid has already reached the limit for ${reaction.emoji}'s. You can still join the raid, but will no longer be given early location.`);
                        } else {
                            user.send(`You have successfully cancelled your ${reaction.emoji} reaction for the raid.`);
                        }
                    }).catch(console.error);
                }

            } else if (reaction.emoji === nitroEmoji) {
                if (location) {
                    user.send(`Thanks for being a Nitro Booster for the server! The location for this raid is \`${location}\`.`);
                } else {
                    user.send(`Thanks for being a Nitro Booster for the server! The location for this raid has not been set. Please wait for the location to be announced.`);
                }
            }
        });

        collector.on("end", collected => {
            clearInterval(interval);
            if (!cancelled) {
                moveAfk(raiders, destinationVc);
            }
            endRaidStartReactionCollector(client, collected, cancelled, raidMsg, raidStarter, raidName, primaryEmoji, primaryMin, destinationVc, guildMembers, raiders.size, raidLeaders.size);
            notifMessage.delete();
        });

        for (emoji of emojiList) {
            raidMsg.react(emoji);
        }

        // updates message with remaining time
        interval = setInterval (() => {
            remainingTime -= 5000;
            embed = raidStartMessage(client, raidStarter, raidName, raidDescription, destinationVc, remainingTime, raiders.size, raidLeaders.size);
            raidMsg.edit(embed);
        }, 5000);
    }).catch(console.error);
}