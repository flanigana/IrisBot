const tools = require("../general/tools");
const realmEyeTools = require("../general/realmEyeTools");
const raidTools = require("../raidManager/raidTools");

const createPlayerList = async (visionClient, url) => {
    const [fullResult] = await visionClient.textDetection(url);
    const detections = fullResult.textAnnotations;

    let players = {
        playerCount: -1,
        playerList: [],
    };

    for (let i=1; i < detections.length; i++) {
        const word = detections[i].description;
        if (word.toLowerCase() === "players" || word.toLowerCase() === "online") {
            continue;
        } else if (word.startsWith("(") && word.endsWith("):")) {
            players.playerCount = parseInt(word.substring(1, word.length-2));

        } else if (word.match(/([A-Za-z]+,+)/)) {
            players.playerList.push(word.substring(0, word.length-1));

        } else if (word.match(/([A-Za-z]+)/)) {
            players.playerList.push(word);
        }
    }

    return players;
};

const compareToVoiceChannel = (playerList, channel) => {
    let results = {
        present: [],
        missing: [],
    };

    let voiceMembers = [];
    channel.members.forEach(member => {
        voiceMembers.push(member);
    });

    for (const player of playerList) {
        const regex = new RegExp(`\\b`+player+`\\b`, "gi");
        let present = false;

        for (const member of voiceMembers) {
            if (regex.test(member.displayName)) {
                results.present.push(player);
                present = true;
                break;
            }
        }

        if (!present) {
            results.missing.push(player);
        }
    }

    return results;
};

const checkRequirements = async (playerList, reqs, classInfo) => {
    let results = {
        passed: [],
        failed: [],
    };

    if (playerList.length === 0) {
        return results;
    }
    
    const reqsSplit = reqs.split(" | ");

    let promises = [];
    let playerCount = 0;
    const intervalTime = 300;
    const minimumWait = 1000;
    const pause = ((playerList.length+1)*intervalTime) > minimumWait ? ((playerList.length+1)*intervalTime) : minimumWait;
    promises.push(new Promise((resolve, reject) => {
        let wait = setTimeout(() => {
            clearTimeout(wait);
            resovle();
        }, pause);
    }));

    let interval = setInterval (() => {
        if (playerCount === playerList.length-1) {
            clearInterval(interval);
        }

        // saves the player position in the interval
        let playerNum = playerCount;
        promises.push(realmEyeTools.getRealmEyeInfo(playerList[playerNum], false, classInfo).then(realmEyeData => {
            if (realmEyeData.exists && !realmEyeData.hiddenCharacters && realmEyeData.characters.length > 0) {
                const recentCharacter = realmEyeData.characters[0];
                for (const req of reqsSplit) {
                    if (!recentCharacter[`max${req}`]) {
                        results.failed.push(playerList[playerNum]);
                        return false;
                    }
                }
                results.passed.push(playerList[playerNum]);
                return true;
                
            } else {
                results.failed.push(playerList[playerNum]);
                return false;
            }
        }));
        
        playerCount++;
    }, intervalTime);

    return Promise.all(promises).then(() => {
        return results;
    }).catch(console.error);
};

const invalidChannel = (client, msg, channel) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Invalid Channel")
        .setDescription(`The channel ${channel} is not a valid voice channel.`);
    msg.channel.send(embed);
};

const imageNotFound = (client, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("No Image Found")
        .setDescription("There was no png or jpg image attached to the message.");
    msg.channel.send(embed);
};

const attachmentNotFound = (client, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("No Attachment Found")
        .setDescription("You must include an attached png or jpg to the message.");
    msg.channel.send(embed);
};

module.exports.parse = async (client, p, msg, visionClient, guildConfig, classInfo, db) => {

    const args = tools.getArgs(msg.content, p, 1);
    const channel = tools.getChannel(msg.guild, args[0], "voice");
    if (!channel) {
        invalidChannel(client, msg, args[0]);
        return false;
    }

    if (msg.attachments.size > 0) {
        msg.attachments.forEach(async attach => {
            if (attach.url.endsWith(".png") || attach.url.endsWith(".jpg")) {
                let embed = tools.getStandardEmbed(client)
                    .setTitle("Beginning Parsing...");
                msg.channel.send(embed).then(async sent => {
                    const parseResults = await createPlayerList(visionClient, attach.url);
                    const voiceResults = await compareToVoiceChannel(parseResults.playerList, channel);

                    embed = tools.getStandardEmbed(client)
                        .setTitle("Parsing Results")
                        .addField(`Not In Voice (${voiceResults.missing.length})`, voiceResults.missing.length > 0 ? voiceResults.missing : "No missing players");
                        
                    sent.edit(embed);

                    if (args.length > 1) {
                        const templateName = raidTools.raidTemplateExists(args[1], guildConfig);
                        let reqResults;
                        if (templateName) {
                            let loadingRest = tools.getStandardEmbed(client)
                                .setTitle("Parsing Results")
                                .addFields(
                                    {name: `Not In Voice (${voiceResults.missing.length})`, value: voiceResults.missing.length > 0 ? voiceResults.missing : "No missing players"},
                                    {name: "Loading...", value: "Checking Players for Stat Requirements..."},
                                );
                            sent.edit(loadingRest);

                            const template = await raidTools.getRaidTemplate(templateName, guildConfig, db);
                            reqResults = await checkRequirements(voiceResults.present, template.reqs, classInfo);
                        }

                        embed = embed.addField(`Failed Stat Requirement Check (${reqResults.failed.length})`, reqResults.failed.length > 0 ? reqResults.failed : "No players failed stat requirement checks");
                    }
                        
                    if ((parseResults.playerCount != parseResults.playerList.length) && (parseResults.playerCount-1 != parseResults.playerList.length)) {
                        embed = embed.addField("WARNING: Player Counts May Not Match", `**Expected Count:** ${parseResults.playerCount !== -1 ? parseResults.playerCount : "Failed to find player count."}
**Actual Count:** ${parseResults.playerList.length}
\nIt's likely players are missing from the player list due to results with low confidence scores. In order to prevent this, crop the image the best you can and try to create the most contrast between the player list and the background.`);
                    }
                    sent.edit(embed);
                }).catch(console.error);

            } else {
                imageNotFound(client, msg);
            }
        });
    } else {
        attachmentNotFound(client, msg);
    }
};