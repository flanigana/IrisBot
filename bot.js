require("dotenv").config();

const Discord = require("discord.js");
const Canvas = require("canvas");
const { Image } = require("canvas");
const Jimp = require("jimp");
const admin = require("firebase-admin");

const tools = require("./tools");
const renders = require("./renders");
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
let items = null;

const generalHelp = (msg, p) => {
    const embeded = tools.getStandardEmbeded(client)
            .setTitle("Iris Bot Commands")
            .addFields(
                {name: "Help", value: `\`\`\`${p}help\`\`\``},
                {name: "Server Configuration", value: `\`\`\`${p}config\`\`\``},
                {name: "User Verification", value: `\`\`\`${p}verify\`\`\``},
                {name: "Realm-Related", value: `\`\`\`${p}characters\n${p}ppe\`\`\``},
            )
    msg.channel.send(embeded);
}

const configHelp = (msg, p) => {
    const embeded = tools.getStandardEmbeded(client)
        .setTitle("Iris Bot Configuration Commands")
        .setDescription("Commands to set up your server for user verification")
        .addFields(
            {name: "View Current Configuration", value: `\`\`\`${p}config list\`\`\``},
            {name: "Server Setup", value: `\`\`\`${p}config prefix\n${p}config permissions\n${p}config guildName\n${p}config verificationChannel\`\`\``},
            {name: "Verification Requirements", value: `\`\`\`${p}config reqs\`\`\``},
            {name: "Role Assignment", value: `\`\`\`${p}config roles\n${p}config allMemberRole\n${p}config nonMemberRole\`\`\``},
        )
    msg.channel.send(embeded);
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

const configGuild = async (msg, p) => {
    if (msg.content.toLowerCase() === `${p}config`) {
        return configHelp(msg, p);
    } else {
        return config.configGuild(client, msg, db);
    }
}

const listCharacters = async (msg, p) => {
    const args = tools.getArgs(msg.content, 1);
    let ign = null;

    if (args.length === 0) {
        ign = await tools.getUserIgn(msg.author.id, db);
        if (!ign) {
            msg.reply(`You need to first verify with a server or supply an ign using \`${p}characters <ign>\``);
            return false;
        }

    } else {
        ign = args[0];
    }

    return tools.getRealmEyeInfo(ign).then(realmEyeData => {
        if (!realmEyeData) {
            msg.reply("there was trouble finding that player on RealmEye...");
            return false;
        }
        let starColor = tools.getStarColor(realmEyeData.rank);
        if (starColor === "light blue") {
            starColor = "lightblue";
        }
        starColor += "star";
        const starEmoji = client.emojis.cache.find(emoji => emoji.name === starColor);
        const fameEmoji = client.emojis.cache.find(emoji => emoji.name === "fameicon");
        const buffer = renders.characterListVisualization(realmEyeData, items);
        const attachment = new Discord.MessageAttachment(buffer, "characterList.png");
        const embeded = tools.getStandardEmbeded(client)
            .setTitle(`${ign}'s Characters`)
            .attachFiles(attachment)
            .setImage("attachment://characterList.png")
            .addFields(
                {name: "User", value: `${realmEyeData.name}`, inline: true},
                {name: "Alive Fame", value: `${fameEmoji}${realmEyeData.fame}`, inline: true},
                {name: "Guild", value: `${realmEyeData.guild}`, inline: true},
                {name: "Rank", value: `${starEmoji}${realmEyeData.rank}`, inline: true},
                {name: "Characters", value: `${realmEyeData.characters.length}`, inline: true},
                {name: "Guild Rank", value: `${realmEyeData.guildRank}`, inline: true},

            )
        msg.channel.send(embeded);
        return true;
    }).catch(console.error);
}

const ppe = msg => {
    const characterNum = Math.floor(Math.random() * 15);
    const character = tools.classEnumerator(characterNum);

    msg.reply(`you should play ${character.toLowerCase()} for your next ppe!`);
}

client.on("ready", async () => {
    renders.loadRenders(realmEyeRendersUrl, realmEyeDefinitionsUrl).then(results => {
        items = results;
    });
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", async guild => {
    return setUpGuild(guild);
});

client.on("message", async msg => {
    if (msg.author.id != client.user.id) {

        // const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
        // verification.sendGuildVerificationSuccess(client, msg.channel, guildMember, "iAlec", items);

        if (msg.guild) {
            const p = await tools.getPrefix(msg.guild.id, db);
            if (!msg.content.toLowerCase().startsWith(p)) {
                return false;
            }

            if (msg.content.toLowerCase().startsWith(`${p}help`)) {
                helpCommand(msg, p);

            } else if (msg.content.toLowerCase().startsWith(`${p}config`)) {
                return configGuild(msg, p).then(() => {
                    return true;
                });

            } else if (msg.content.toLowerCase().startsWith(`${p}verify`)) {
                verification.beginVerification(client, msg, db).then(() => {
                    msg.delete();
                    return true;
                });

            } else if (msg.content.toLowerCase().startsWith(`${p}characters`)) {
                listCharacters(msg, p);

            } else if (msg.content.toLowerCase().startsWith(`${p}ppe`)) {
                ppe(msg);
            }
        }

        if ((msg.content.toLowerCase().startsWith("!verify")) && (msg.channel.type === "dm")) {
            return verification.checkForVerification(msg, client, db, items);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);