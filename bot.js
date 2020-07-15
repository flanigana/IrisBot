require("dotenv").config();

const Discord = require("discord.js");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");

const tools = require("./tools");
const config = require("./config");
const verification = require("./verification/verification");
const render = require("./render");
const raidManager = require("./raidManager/raidManager");
const raidShorthand = require("./raidManager/raidShorthand");
const parser = require("./parser/parser");

const client = new Discord.Client();
admin.initializeApp({
    credential: admin.credential.cert({
        "project_id": process.env.PROJECT_ID,
        "client_email": process.env.FIREBASE_CLIENT_EMAIL,
        "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
});
const db = admin.firestore();
const visionClient = new vision.ImageAnnotatorClient();

const parserServerWhitelist = ["710578568211464192", "708761992705474680", "726510098737922108"];
const realmEyeRendersUrl = "https://www.realmeye.com/s/e0/css/renders.png";
const realmEyeDefinitionsUrl = "https://www.realmeye.com/s/e0/js/definition.js";
let classInfo;
let renders;

const setUpGuild = async guild => {
    return db.collection("guilds").doc(guild.id).set({
        admins: [],
        allowBooster: false,
        bannedUsers: [],
        boosterRole: null,
        confirmationChannel: null,
        defaultRunTimeSec: 120,
        guildId: guild.id,
        guildName: guild.name,
        guildOwner: guild.owner.id,
        mods: [],
        prefix: "!",
        raidLeaderRoles: [],
        raidTemplateNames: [],
        sendConfirmations: false,
        shorthandNames: [],
        verificationTemplateNames: [],
    });
};

const generalHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
            .setTitle("Iris Bot Commands")
            .addFields(
                {name: "Server Configuration", value: `\`\`\`${p}config\`\`\``},
                {name: "Raid Manager", value: `\`\`\`${p}raid\`\`\``},
                {name: "User Verification", value: `\`\`\`${p}verification\`\`\``},
                {name: "Realm-Related", value: `\`\`\`${p}realmEye\n${p}ppe\`\`\``},
            );
    msg.channel.send(embed);
};

const configHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Configuration Commands")
        .setDescription("Commands to configure bot permissions and general settings for your server.")
        .addFields(
            {name: "Server Setup", value: `\`\`\`${p}config prefix\n${p}config admins\n${p}config mods\`\`\``},
            {name: "View Current Configuration", value: `\`\`\`${p}config list\`\`\``},
        );
    msg.channel.send(embed);
};

const verifyHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Verification Commands")
        .setDescription("Commands to set up and use verification in your server.")
        .addFields(
            {name: "Verification Configuration", value: `\`\`\`${p}verification\`\`\``},
            {name: "List Existing Verification Templates", value: `\`\`\`${p}verification list\`\`\``},
            {name: "Verification Template Management", value: `\`\`\`${p}verification create\n${p}verification edit\n${p}verification delete\`\`\``},
            {name: "Verifying", value: `\`\`\`${p}verify\n${p}unverify\n${p}manualVerify\`\`\``},
        );
    msg.channel.send(embed);
};

const unverifyHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Unverify")
        .setDescription(`Unverify a user that is verified in one of your server's verification templates using the following command:
\`\`\`${p}unverify <@userOruserId> <templateNameOR#verificationChannel>\`\`\``)
        .addField("View Verification Template Names", `To view this server's verification templates, use the \`${p}verification list\` command.`);
    msg.channel.send(embed);
};

const manualVerifyHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Manual Verification")
        .setDescription(`Manually verify a user that is not in your guild or does not meet requirements using the following command:
\`\`\`${p}manualVerify <@userOruserId> <templateNameOR#verificationChannel>\`\`\``)
        .addField("View Verification Template Names", `To view this server's verification templates, use the \`${p}verification list\` command.`);
    msg.channel.send(embed);
};

const raidHelp = (p, msg) => {
    const embed = tools.getStandardEmbed(client)
        .setTitle("Iris Bot Raid Commands")
        .setDescription("Commands to run raids in your server.")
        .addFields(
            {name: "Raid Configuration", value: `\`\`\`${p}raid config\n${p}raid shorthand\`\`\``},
            {name: "List Existing Raid Templates", value: `\`\`\`${p}raid list\`\`\``},
            {name: "Raid Template Management", value: `\`\`\`${p}raid create\n${p}raid edit\n${p}raid delete\`\`\``},
            {name: "Raiding", value: `\`\`\`${p}raid start\`\`\``},
        );
    msg.channel.send(embed);
};

const configGuild = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length === 0) {
        return configHelp(p, msg);
    } else {
        return config.configGuild(client, p, msg, guildConfig, db);
    }
};

const verify = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 0);
    if (args[0].toLowerCase() === "verification" && args.length === 1) {
        return verifyHelp(p, msg);
    } else if (args[0].toLowerCase() === "unverify" && args.length === 1) {
        return unverifyHelp(p, msg);
    } else {
        return verification.verification(client, p, msg, guildConfig, db);
    }
};

const manualVerify = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length < 2) {
        return manualVerifyHelp(p, msg);
    } else {
        return verification.manualVerify(client, p, msg, guildConfig, db);
    }
};

const raid = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length === 0) {
        return raidHelp(p, msg);
    } else {
        return raidManager.raid(client, p, msg, guildConfig, db);
    }
};

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
            let capitalized = reaction.emoji.name;
            capitalized = capitalized.charAt(0).toUpperCase() + capitalized.substring(1, capitalized.length-5);
            selectedCharacters.push(capitalized);
        }
    });
    // set list to all classes if none are selected
    if (selectedCharacters.length === 0) {
        selectedCharacters = Object.getOwnPropertyNames(classInfo);
    }
    // generate class based on selected classes
    const characterNum = Math.floor(Math.random() * selectedCharacters.length);
    let character = selectedCharacters[characterNum];
    const characterImage = classInfo[character].defaultSkin;

    // edit embed in message to class selection
    const embed = tools.getStandardEmbed(client)
        .setTitle(`You Should Play ${character}`)
        .setImage(characterImage);
    msg.edit(embed);
    msg.reactions.removeAll().catch(console.error);
};

const ppe = (msg) => {
    let emojiList = [];
    const classList = Object.getOwnPropertyNames(classInfo);
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
            endPpeReactionCollector(collected, m, msg);
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

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log("Loading...");
    let promises = [];
    promises.push(tools.getClassInfo().then(results => {
        classInfo = results;
        return results;
    }).then(async classInfo => {
        return render.loadRenders(realmEyeRendersUrl, realmEyeDefinitionsUrl, classInfo).then(results => {
            renders = results;
            return true;
        });
    }));
    
    Promise.all(promises).then(() => {
        console.log("Ready!");
    })
});

client.on("guildCreate", async guild => {
    return setUpGuild(guild);
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
    if (oldGuild.name !== newGuild.name) {
        return db.collection("guilds").doc(newGuild.id).update({
            guildName: newGuild.name,
        });
    }
});

client.on("message", async msg => {
    if (msg.author.id != client.user.id) {
        
        if (msg.guild) {

            const guildConfig = await tools.getGuildConfig(msg.guild.id, db, msg);
            if (!guildConfig) {
                return false;
            }
            const p = guildConfig.prefix;
            const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
            
            if (!msg.content.toLowerCase().startsWith(p)) {
                return false;
            }

            const args = tools.getArgs(msg.content, p, 0);

            switch (args[0].toLowerCase()) {
                case "help":
                    generalHelp(p, msg);
                    break;
                case "config":
                    if (tools.isAdmin(guildMember, guildConfig)) {
                        configGuild(p, msg, guildConfig);
                    }
                    break;
                case "verify":
                case "unverify":
                case "verification":
                    verify(p, msg, guildConfig);
                    break;
                case "updateign":
                    msg.delete();
                    verification.beginIgnVerification(client, msg, db);
                    break;
                case "manualverify":
                    if (tools.isMod(guildMember, guildConfig)) {
                        manualVerify(p, msg, guildConfig);
                    }
                    break;
                case "realmeye":
                    const ign = args[1] ? args[1] : "";
                    render.realmEyeDisplay(client, p, ign, msg.author.id, msg.channel, db, renders);
                    break;
                case "guild":
                    let guildName = args[1] ? args[1] : "";
                    for (let i=2; i<args.length; i++) {guildName += ` ${args[i]}`;}
                    render.guildDisplay(client, p, guildName, msg.guild.id, msg.channel, db, renders);
                    break;
                case "ppe":
                    ppe(msg);
                    break;
                case "raid":
                    if (tools.isAdmin(guildMember, guildConfig) || tools.isRaidLeader(guildMember, guildConfig)) {
                        raid(p, msg, guildConfig);
                    }
                    break;
                case "r":
                    if (tools.isAdmin(guildMember, guildConfig) || tools.isRaidLeader(guildMember, guildConfig)) {
                        raidShorthand.startShorthand(client, p, msg, guildConfig, db);
                    }
                    break;
                case "parse":
                    if (parserServerWhitelist.includes(msg.guild.id)) {
                        if (tools.isAdmin(guildMember, guildConfig) || tools.isRaidLeader(guildMember, guildConfig)) {
                            parser.parse(client, p, msg, visionClient, guildConfig, db);
                        }
                    }
                    break;
            }
        }

        const args = tools.getArgs(msg.content, "!");
        if (msg.channel.type === "dm") {

            switch (args[0].toLowerCase()) {
                case "verify":
                    if (args.length > 1) {
                        verification.checkForIgnVerification(client, msg, db);
                    } else {
                        const embed = tools.getStandardEmbed(client)
                            .setTitle("Invalid Command")
                            .setDescription(`In order to verify your IGN, you need include your IGN in the command, such as \`!verify <ign>\`.
\nIf you'd like to change the IGN the bot has on record for your account, use the command \`!updateIGN\` and follow the steps.`);
                        msg.channel.send(embed);
                    }
                    break;
                case "updateign":
                    verification.beginIgnVerification(client, msg, db);
                    break;
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);