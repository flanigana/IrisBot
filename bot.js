require("dotenv").config();

const Discord = require("discord.js");
const admin = require("firebase-admin");

const tools = require("./tools");
const render = require("./render");
const config = require("./config");
const verification = require("./verification");

const client = new Discord.Client();
admin.initializeApp({
    credential: admin.credential.cert({
        "project_id": process.env.PROJECT_ID,
        "client_email": process.env.FIREBASE_CLIENT_EMAIL,
        "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
});
const db = admin.firestore();

const realmEyeRendersUrl = "https://www.realmeye.com/s/e0/css/renders.png";
const realmEyeDefinitionsUrl = "https://www.realmeye.com/s/e0/js/definition.js";
let renders = null;

const generalHelp = (msg, p) => {
    const embed = tools.getStandardEmbed(client)
            .setTitle("Iris Bot Commands")
            .addFields(
                {name: "Help", value: `\`\`\`${p}help\`\`\``},
                {name: "Server Configuration", value: `\`\`\`${p}config\`\`\``},
                {name: "User Verification", value: `\`\`\`${p}verify\`\`\``},
                {name: "Realm-Related", value: `\`\`\`${p}realmEye\n${p}ppe\`\`\``},
            )
    msg.channel.send(embed);
}

const configHelp = (msg, p) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Configuration Commands")
        .setDescription("Commands to set up your server for user verification")
        .addFields(
            {name: "View Current Configuration", value: `\`\`\`${p}config list\`\`\``},
            {name: "Server Setup", value: `\`\`\`${p}config prefix\n${p}config permissions\n${p}config guildName\n${p}config verificationChannel\`\`\``},
            {name: "Verification Requirements", value: `\`\`\`${p}config reqs\`\`\``},
            {name: "Role Assignment", value: `\`\`\`${p}config roles\n${p}config allMemberRole\n${p}config nonMemberRole\`\`\``},
        )
    msg.channel.send(embed);
}

const helpCommand = (msg, p) => {
    if (msg.content.toLowerCase() === `${p}help`) {
        generalHelp(msg, p);
    } else if (msg.content.toLowerCase() === `${p}help config`) {
        configHelp(msg, p);
    }
}

const setUpGuild = async guild => {
    const defaultChannelId = msg.guild.channels.cache.find(channel => channel.type === "text");

    return db.collection("guilds").doc(guild.id).set({
        guildId: guild.id,
        guildOwner: guild.owner.id,
        guildName: guild.name,
        prefix: "!",
        realmGuildName: null,
        permissions: [],
        fameReq: 0,
        rankReq: 0,
        sixEightReq: 0,
        eightEightReq: 0,
        sixEightMeleeReq: 0,
        eightEightMeleeReq: 0,
        verifiedUsers: [],
        bannedUsers: [],
        assignRoles: false,
        assignAllMember: false,
        assignNonMember: false,
        founderRole: null,
        leaderRole: null,
        officerRole: null,
        memberRole: null,
        initiateRole: null,
        allMemberRole: null,
        nonMemberRole: null,
        globalVerification: true,
        verificationChannel: defaultChannelId,
        verificationLogChannel: defaultChannelId,
    });
}

const configGuild = async (msg, p, guildConfig) => {
    if (msg.content.toLowerCase() === `${p}config`) {
        return configHelp(msg, p);
    } else {
        return config.configGuild(client, msg, guildConfig, db);
    }
}

const endPpeReactionCollector = (collected, msg, originalMsg) => {
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
            selectedCharacters.push(reaction.emoji.name);
        }
    });
    // set list to all classes if none are selected
    if (selectedCharacters.length === 0) {
        selectedCharacters = tools.getClasses();
    }
    // generate class based on selected classes
    const characterNum = Math.floor(Math.random() * selectedCharacters.length);
    let character = selectedCharacters[characterNum];
    character = character.charAt(0).toUpperCase() + character.slice(1);
    const characterImage = render.getDefaultClassSkinUrl(character);

    // edit embed in message to class selection
    const embed = tools.getStandardEmbed(client)
        .setTitle(`You Should Play ${character}`)
        .setImage(characterImage);
    msg.edit(embed);
    msg.reactions.removeAll().catch(console.error);
}

const ppe = msg => {
    const emojiList = [];
    for (char of tools.getClasses()) {
        emojiList.push(tools.getEmoji(client, `${char.toLowerCase()}class`));
    }
    emojiList.push("✅");
    emojiList.push("❌");

    let embed = tools.getStandardEmbed(client)
        .setTitle("PPE Recommendation")
        .setDescription(`React with the classes you are willing to play or select none for all to be chosen.
Once classes are selected, react with ✅ to recieve your recommendation.
React with ❌ to cancel.`);

    const reactionFilter = (reaction, user) => ((user.id === msg.author.id) && (emojiList.includes(reaction.emoji) || reaction.emoji.name === "✅" || reaction.emoji.name === "❌"))
    let collector = null;
    msg.channel.send(embed).then(m => {
        collector = m.createReactionCollector(reactionFilter, {time: 60000});
        collector.on("collect", reaction => {
            if (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") {
                collector.stop();
            }
        });
        collector.on("end", collected => {
            endPpeReactionCollector(collected, m, msg);
        });

        let promises = [];
        for (emoji of emojiList) {
            promises.push(m.react(emoji));
        }
        Promise.all(promises).then(() => {
            return true;
        });
    });
}

client.on("ready", async () => {
    render.loadRenders(realmEyeRendersUrl, realmEyeDefinitionsUrl).then(results => {
        renders = results;
    });
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", async guild => {
    return setUpGuild(guild);
});

client.on("message", async msg => {
    if (msg.author.id != client.user.id) {

        if (msg.guild) {
            const guildConfig = await tools.getGuildConfig(msg.guild.id, db);
            const p = guildConfig.prefix;
            if (!msg.content.toLowerCase().startsWith(p)) {
                return false;
            }
            const args = tools.getArgs(msg.content, p, 1);

            if (msg.content.toLowerCase().startsWith(`${p}help`)) {
                helpCommand(msg, p);

            } else if (msg.content.toLowerCase().startsWith(`${p}config`)) {
                return configGuild(msg, p, guildConfig).then(() => {
                    return true;
                });

            } else if (msg.content.toLowerCase().startsWith(`${p}verify`)) {
                verification.beginVerification(client, msg, db).then(() => {
                    msg.delete();
                    return true;
                });

            } else if (msg.content.toLowerCase().startsWith(`${p}realmeye`)) {
                const ign = args[0] ? args[0] : "";
                render.realmEyeDisplay(client, p, ign, msg.author.id, msg.channel, db, renders);

            } else if (msg.content.toLowerCase().startsWith(`${p}guild`)) {
                let guildName = args[0] ? args[0] : "";
                for (let i=1; i<args.length; i++) {guildName += ` ${args[i]}`}
                render.guildDisplay(client, p, guildName, msg.guild.id, msg.channel, db, renders);

            } else if (msg.content.toLowerCase().startsWith(`${p}ppe`)) {
                ppe(msg);
            }
        }

        if ((msg.content.toLowerCase().startsWith("!verify")) && (msg.channel.type === "dm")) {
            return verification.checkForVerification(msg, client, db);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);