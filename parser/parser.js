const Tessaract = require("tesseract.js");
const tools = require("../tools");

const parseImage = async (url) => {
    return Tessaract.recognize(`${url}`, "eng").then(res => {
        let results = {
            playerCount: 0,
            players: []
        };

        let start = false;
        for (let word of res.data.words) {

            if (word.text.startsWith("(") && word.text.endsWith("):")) {
                results.playerCount = parseInt(word.text.substring(1, word.text.length-2));
                start = true;

            } else if (start && word.text.match(/([A-Za-z]+,+)/)) {
                results.players.push(word.text.substring(0, word.text.length-1));

            } else if (start && word.text.match(/([A-Za-z]+)/)) {
                results.players.push(word.text);
                break;

            }
        }
        
        console.log(`Player count is ${results.playerCount}`);
        console.log(results.players);
        console.log(`Player list length is ${results.players.length}`);

        return results;
    });
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
    if (msg.attachments.size > 0) {
        msg.attachments.every(async attach => {
            if (attach.url.endsWith(".png") || attach.url.endsWith(".jpg")) {
                results = await parseImage(attach.url);

                const embed = tools.getStandardEmbed(client)
                    .setTitle("Parsing Results")
                    .addFields(
                        {name: "Player Count", value: results.playerCount},
                        {name: `Player List (${results.players.length})`, value: results.players.length > 0 ? results.players : "No players found"}
                    );
                msg.channel.send(embed);

            } else {
                imageNotFound(client, msg);
            }
        });
    } else {
        attachmentNotFound(client, msg);
    }
}