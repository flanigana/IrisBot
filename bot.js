require("dotenv").config();

const Discord = require("discord.js");
const admin = require("firebase-admin");

const tools = require("./tools");
const config = require("./config");
const verification = require("./verification");
const render = require("./render");
const raidManager = require("./raidManager/raidManager");
const raidShorthand = require("./raidManager/raidShorthand");

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

const generalHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
            .setTitle("Iris Bot Commands")
            .addFields(
                {name: "Server Configuration", value: `\`\`\`${p}config\`\`\``},
                {name: "Raid Manager", value: `\`\`\`${p}raid\`\`\``},
                {name: "User Verification", value: `\`\`\`${p}verify\`\`\``},
                {name: "Realm-Related", value: `\`\`\`${p}realmEye\n${p}ppe\`\`\``},
            );
    msg.channel.send(embed);
}

const configHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Configuration Commands")
        .setDescription("Commands to set up your server for user verification.")
        .addFields(
            {name: "View Current Configuration", value: `\`\`\`${p}config list\`\`\``},
            {name: "Server Setup", value: `\`\`\`${p}config prefix\n${p}config permissions\n${p}config guildName\n${p}config verificationChannel\`\`\``},
            {name: "Verification Requirements", value: `\`\`\`${p}config reqs\`\`\``},
            {name: "Role Assignment", value: `\`\`\`${p}config roles\n${p}config allMemberRole\n${p}config nonMemberRole\`\`\``},
        );
    msg.channel.send(embed);
}

const raidHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
    .setTitle("Iris Bot Raid Commands")
    .setDescription("Commands to run raids in your server.")
    .addFields(
        {name: "List Existing Raid Templates", value: `\`\`\`${p}raid list\`\`\``},
        {name: "Raid Template Management", value: `\`\`\`${p}raid create\n${p}raid edit\n${p}raid delete\`\`\``},
        {name: "Raiding", value: `\`\`\`${p}raid start\`\`\``},
    );
    msg.channel.send(embed);
}

const helpCommand = (p, msg) => {
    if (msg.content.toLowerCase() === `${p}help`) {
        generalHelp(p, msg);
    } else if (msg.content.toLowerCase() === `${p}help config`) {
        configHelp(p, msg);
    }
}

const setUpGuild = async guild => {
    const defaultChannelId = guild.channels.cache.find(channel => channel.type === "text").id;

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
        raidLeaderRoles: [],
        raidTemplateNames: [],
        raidTemplateNamesIds: [],
    });
}

const configGuild = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length === 0) {
        return configHelp(p, msg);
    } else {
        return config.configGuild(client, p, msg, guildConfig, db);
    }
}

const raid = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length === 0) {
        return raidHelp(p, msg);
    } else {
        return raidManager.raid(client, p, msg, guildConfig, db);
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
    character = character.substring(0, character.length-5);
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
    let emojiList = [];
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

    const reactionFilter = (reaction, user) => ((user.id === msg.author.id) && (emojiList.includes(reaction.emoji) || reaction.emoji.name === "✅" || reaction.emoji.name === "❌"));
    msg.channel.send(embed).then(m => {
        const collector = m.createReactionCollector(reactionFilter, {time: 60000});
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

        return Promise.all(promises).then(() => {
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

        const yep = await tools.getRealmEyeInfo("EraofMod");
        console.log(yep);
        
        if (msg.guild) {
            const guildConfig = await tools.getGuildConfig(msg.guild.id, db);
            const p = guildConfig.prefix;
            if (!msg.content.toLowerCase().startsWith(p)) {
                return false;
            }
            const args = tools.getArgs(msg.content, p, 0);

            switch (args[0]) {
                case "help":
                    helpCommand(p, msg);
                    break;
                case "config":
                    configGuild(p, msg, guildConfig);
                    break;
                case "verify":
                    verification.beginVerification(client, msg, db);
                    msg.delete();
                    break;
                case "realmeye":
                    const ign = args[1] ? args[1] : "";
                    render.realmEyeDisplay(client, p, ign, msg.author.id, msg.channel, db, renders);
                    break;
                case "guild":
                    let guildName = args[1] ? args[1] : "";
                    for (let i=2; i<args.length; i++) {guildName += ` ${args[i]}`}
                    render.guildDisplay(client, p, guildName, msg.guild.id, msg.channel, db, renders);
                    break;
                case "ppe":
                    ppe(msg);
                    break;
                case "raid":
                    raid(p, msg, guildConfig);
                    break;
                case "r":
                    raidShorthand.startShorthand(client, p, msg, guildConfig, db);
                    break;
            }
        }

        if ((msg.content.toLowerCase().startsWith("!verify")) && (msg.channel.type === "dm")) {
            verification.checkForVerification(msg, client, db);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);