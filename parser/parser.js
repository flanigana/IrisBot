const Tessaract = require("tesseract.js");
const tools = require("../tools");

const parseImage = async (url) => {
    const worker = Tessaract.createWorker();
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    await worker.setParameters({
        tessjs_create_hocr: "0",
        tessjs_create_tsv: "0",
    });
    const results = await worker.recognize(url);
    await worker.terminate();
    return results;
}

const createPlayerList = async (url) => {
    const results = await parseImage(url);

    let players = {
        playerCount: -1,
        playerList: [],
        lowConfidence: false,
    };

    for (const part of results.data.words) {
        const word = part.text;
        if (word.toLowerCase() === "players" || word.toLowerCase() === "online") {
            continue;
        }
        if (part.choices[0].confidence < 55) {
            players.lowConfidence = true;
            continue;
        }

        if (word.startsWith("(") && word.endsWith("):")) {
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

module.exports.parse = (client, p, msg, db) => {
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
                    parseResults = await createPlayerList(attach.url);
                    voiceResults = compareToVoiceChannel(parseResults.playerList, channel);
                    

                    embed = tools.getStandardEmbed(client)
                        .setTitle("Parsing Results")
                        .addField(`Missing Players (${voiceResults.missing.length})`, voiceResults.missing.length > 0 ? voiceResults.missing : "No missing players");
                        
                    if (parseResults.lowConfidence || (parseResults.playerCount != parseResults.playerList.length && parseResults.playerCount-1 != parseResults.playerList.length)) {
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