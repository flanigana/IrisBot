const tools = require("../general/tools");

const endPpeReactionCollector = (collected, msg, originalMsg, classInfo, client) => {
    let selectedCharacters = [];
    // delete message if cancelled
    if (collected.has("❌")) {
        msg.delete();
        originalMsg.delete();
        return false;
    }
    // add selected classes to class list
    collected.map(reaction => {
        if (reaction.emoji.name != "✅") {
            let capitalized = reaction.emoji.name;
            capitalized = capitalized.charAt(0).toUpperCase() + capitalized.substring(1, capitalized.length-5);
            selectedCharacters.push(capitalized);
        }
    });
    // set list to all classes if none are selected
    if (selectedCharacters.length === 0) {
        selectedCharacters = classInfo.classList;
    }
    // generate class based on selected classes
    const characterNum = Math.floor(Math.random() * selectedCharacters.length);
    let character = selectedCharacters[characterNum];
    let characterImage;
    if (classInfo.exists) {
        characterImage = classInfo[character].defaultSkin;
    }

    // edit embed in message to class selection
    let embed = tools.getStandardEmbed(client)
        .setTitle(`You Should Play ${character}`);
    if (characterImage) {
        embed = embed.setImage(characterImage);
    }
    msg.edit(embed);
    msg.reactions.removeAll().catch(console.error);
};

module.exports.ppe = (msg, classInfo, client) => {
    let emojiList = [];
    const classList = classInfo.classList;
    for (char of classList) {
        emojiList.push(tools.getEmoji(client, `${char.toLowerCase()}class`, msg.guild.id));
    }
    emojiList.push("✅");
    emojiList.push("❌");

    let embed = tools.getStandardEmbed(client)
        .setTitle("PPE Recommendation")
        .setDescription(`React with the classes you are willing to play or select none for all to be chosen.
Once classes are selected, react with ✅ to recieve your recommendation.
React with ❌ to cancel.`);

    const reactionFilter = (reaction, user) => ((user.id === msg.author.id) && (emojiList.includes(reaction.emoji) || reaction.emoji.name === "✅" || reaction.emoji.name === "❌"));
    msg.channel.send(embed).then(m => {
        const collector = m.createReactionCollector(reactionFilter, {time: 60000});
        collector.on("collect", reaction => {
            if (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") {
                collector.stop();
            }
        });
        collector.on("end", collected => {
            endPpeReactionCollector(collected, m, msg, classInfo, client);
        });

        let promises = [];
        for (const emoji of emojiList) {
            promises.push(m.react(emoji));
        }

        return Promise.all(promises).then(() => {
            return true;
        });
    });
};