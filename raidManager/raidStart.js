const tools = require("../tools");
const raidTools = require("./raidTools");

const raidStatusUpdated = (client, status, raidMsg, raidStarter, raidName, destinationVc, emoji, reactsCount, min, stoppedBy) => {
    let embed = tools.getStandardEmbed(client);
    switch (status) {
        case "passed":
            embed = embed.setAuthor(`${raidName} successfully started by ${raidStarter.displayName} in ${destinationVc.name}.`, raidStarter.user.avatarURL())
                .setDescription(`The raid check has ended with ${reactsCount} raider reacts.`);
            if (stoppedBy) {
                embed = embed.setFooter(`Raid check stopped early by ${stoppedBy.displayName}`);
            }
            break;
        case "moving":
            embed = embed.setAuthor(`${raidName} successfully started by ${raidStarter.displayName} in ${destinationVc.name}.`, raidStarter.user.avatarURL())
                .setDescription(`The raid check has ended. Moving ${reactsCount} raiders into the raid channel.`);
            if (stoppedBy) {
                embed = embed.setFooter(`Raid check stopped early by ${stoppedBy.displayName}`);
            }
            break;
        case "started":
            embed = tools.getStandardEmbed(client)
                .setAuthor(`${raidName} successfully started by ${raidStarter.displayName} in ${destinationVc.name}.`, raidStarter.user.avatarURL())
                .setDescription(`The raid has started with ${reactsCount} raiders.`);
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

const endRaidStartReactionCollector = async (client, collected, cancelled, raidMsg, raidStarter, raidName, primaryEmoji, primaryMin, secondaryEmojis, secondaryMins, idleVc, destinationVc, guildMembers) => {
    let primaryReacts = null;
    let primaryReactsCount = 0;
    let secondaryReactsCount = 0;
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
                    raidStatusUpdated(client, "failed", raidMsg, raidStarter, raidName, null, primaryEmoji, primaryReactsCount, primaryMin, stoppedBy);
                    passedMin = false;
                } else {
                    primaryReacts = reaction.users.cache;
                    return true;
                }
    
            } else if (secondaryEmojis.includes(reaction.emoji)) {
                for (let i=0; i<secondaryEmojis.length; i++) {
                    if (secondaryEmojis[i] === reaction.emoji) {
                        secondaryReactsCount = reaction.count - 1;
                        if (secondaryReactsCount < secondaryMins[i]) {
                            raidStatusUpdated(client, "failed", raidMsg, raidStarter, raidName, null, secondaryEmojis[i], secondaryReactsCount, secondaryMins[i], stoppedBy);
                            passedMin = false;
                        } else {return true}
                    }
                }
            } else {return true;}
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
        raidStatusUpdated(client, "cancelled", raidMsg, raidStarter, raidName, null, null, null, null, stoppedBy);
        return false;
    }

    if (!passedMin) {
        return false;
    } else {
        let promises = [];
        let movedCount = 0;
        raidStatusUpdated(client, "passed", raidMsg, raidStarter, raidName, destinationVc, primaryEmoji, primaryReactsCount, null, stoppedBy);

        if (idleVc && destinationVc) {
            if (primaryReacts != null) {
                primaryReacts.map(user => {
                    raidStatusUpdated(client, "moving", raidMsg, raidStarter, raidName, destinationVc, null, null, null, stoppedBy);
                    if (user.id != client.user.id) {
                        const guildMember = guildMembers.find(mem => mem.id === user.id);
                        const voice = guildMember.voice;
                        if (voice.channel === idleVc) {
                            movedCount++;
                            promises.push(voice.setChannel(destinationVc));
                        }
                    }
                });
            }
        }
        
        Promise.all(promises).then(() => {
            raidStatusUpdated(client, "started", raidMsg, raidStarter, raidName, destinationVc, null, movedCount, null, stoppedBy);
            return true;
        }).catch(console.error);
    }
}

const raidStartMessage = (client, raidStarter, raidName, raidDescription, idleVc, destinationVc, remainingTime, primaryEmoji, primaryMin, secondaryEmojis, secondaryMins) => {
    let embed = tools.getStandardEmbed(client)
        .setAuthor(`${raidName} started by ${raidStarter.displayName} in ${destinationVc.name}.`, raidStarter.user.avatarURL())
        .setDescription(`${raidDescription}`);

    if (primaryMin > 0) {
        embed = embed.addField(`Required ${primaryEmoji} Reacts`, `${primaryMin}`, true);
    }
    for (let i=0; i<secondaryEmojis.length; i++) {
        if (secondaryMins[i] > 0) {
            embed = embed.addField(`Required ${secondaryEmojis[i]} Reacts`, `${secondaryMins[i]}`, true);
        }
    }
    const minutes = Math.floor(remainingTime / (60*1000));
    const seconds = (remainingTime % (60*1000)) / 1000;
    embed = embed.setFooter(`Time Remaining ${minutes} minutes ${seconds} seconds`);

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

const checkRaidStartOptions = async (client, msg, p) => {
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

            if (args.length > 3) {
                // if a custom runtime was included with channels
                const attemptedNum = parseInt(args[3]);
                if (!Number.isNaN(attemptedNum) && attemptedNum > 0) {
                    // multplied for seconds
                    argCheck.runTime = attemptedNum * 1000;
                }
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

module.exports.startRaid = async (client, msg, p, guildConfig, db) => {
    const guildMembers = msg.guild.members.cache;
    const raidStarter = guildMembers.find(mem => mem.id === msg.author.id);
    if (!tools.isRaidLeader(raidStarter, guildConfig)) {
        return false;
    }

    const raidOptions = await checkRaidStartOptions(client, msg, p);
    if (!raidOptions.passed) {
        return false;
    }

    const idleVc = raidOptions.idleVc;
    const destinationVc = raidOptions.destVc;
    const runTime = raidOptions.runTime;
    let remainingTime = runTime;

    const args = tools.getArgs(msg.content, p, 2);
    const templateName = args[0];
    const raidTemplate = await tools.getRaidTemplate(templateName, guildConfig, db, client, msg);
    if (!raidTemplate) {return false;}

    const raidName = raidTemplate.name;
    const raidDescription = raidTools.formatRaidDescription(client, raidTemplate.description);
    
    const primaryEmoji = raidTools.formatPrimaryEmoji(client, raidTemplate);
    const primaryMin = raidTemplate.primaryMin;

    let secondaryEmojis = raidTools.formatSecondaryEmojis(client, raidTemplate);
    let secondaryMins = raidTemplate.secondaryMins;

    let emojiList = [];
    emojiList.push(primaryEmoji);
    for (emoji of secondaryEmojis) {
        emojiList.push(emoji);
    }
    for (listEmoji of raidTemplate.reacts) {
        const emoji = tools.getEmoji(client, listEmoji);
        emojiList.push(emoji);
    }
    emojiList.push("✅");
    emojiList.push("❌");

    let notifMessageContents = `@here ${raidName} started by ${raidStarter.displayName} in ${destinationVc.name}! Join \`${idleVc.name}\` and react to join.`
    let notifMessage = null;
    raidOptions.alertChannel.send(notifMessageContents).then(m => {
        notifMessage = m;
    }).catch(console.error);

    let embed = raidStartMessage(client, raidStarter, raidName, raidDescription, idleVc, destinationVc, remainingTime, primaryEmoji, primaryMin, secondaryEmojis, secondaryMins);

    const raidStartReactionFilter = (reaction, user) => {
        if ((reaction.emoji.name === "✅" || reaction.emoji.name === "❌") && tools.isRaidLeader(guildMembers.find(mem => mem.id === user.id), guildConfig)) {
            return true;
        } else if (!(reaction.emoji.name === "✅" || reaction.emoji.name === "❌") && ((reaction.emoji === primaryEmoji) || (secondaryEmojis.includes(reaction.emoji)))) {
            return true;
        } else {
            return false;
        }
    };
    
    let raidMsg = null;
    let interval = null;
    raidOptions.alertChannel.send(embed).then(m => {
        raidMsg = m;
        let cancelled = false;
        const collector = raidMsg.createReactionCollector(raidStartReactionFilter, {time: runTime});
        collector.on("collect", reaction => {
            if (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") {
                if (reaction.emoji.name === "❌") {
                    cancelled = true;
                }
                collector.stop();
            }
        });
        collector.on("end", collected => {
            clearInterval(interval);
            endRaidStartReactionCollector(client, collected, cancelled, raidMsg, raidStarter, raidName, primaryEmoji, primaryMin, secondaryEmojis, secondaryMins, idleVc, destinationVc, guildMembers);
            notifMessage.delete();
        });

        for (emoji of emojiList) {
            raidMsg.react(emoji);
        }

        // updates message with remaining time
        interval = setInterval (() => {
            remainingTime -= 5000;
            embed = raidStartMessage(client, raidStarter, raidName, raidDescription, idleVc, destinationVc, remainingTime, primaryEmoji, primaryMin, secondaryEmojis, secondaryMins);
            raidMsg.edit(embed);
        }, 5000);
    }).catch(console.error);
}