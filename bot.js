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
    msg.reply(`\`\`\`
    Commands -
    ${p}help : this command list.
    ${p}config : used to configure your server.
    ${p}verify : used to verify for server.
    ${p}characters : lists all characters and account info available on RealmEye.
    ${p}ppe : gives a random class name as a suggestion for a new ppe character.\`\`\``);
}

const configHelp = (msg, p) => {
    msg.reply(`\`\`\`
    Config Commands -
    ${p}config : this command list.
    ${p}config prefix: used to update the bot's command prefix.
    ${p}config list : used to list the current surver configuration.
    ${p}config permissions : used to set which roles can change server configuration. (Note: all server admins can use config commands)
    ${p}config guildName : used to change guild name associated with server. This is needed for verification.
    ${p}config reqs : used to set verification requirements for server.
    ${p}config roles : used to give roles to newly verified members by using guild rank found on RealmEye.
    ${p}config allMemberRole : used to assign a common role to all verified members. This can be used in addition to guild rank roles.
    ${p}config nonMemberRole : used to allow or deny non-guild-members to verify with the server. Useful if you want applicants to verify before being added to guild.
    ${p}config verificationChannel : used to change server's verification channel and the verification log channel.\`\`\``);
}

const helpCommand = (msg, p) => {
    if (msg.content === `${p}help`) {
        generalHelp(msg, p);
    } else if (msg.content === `${p}help config`) {
        configHelp(msg, p);
    }
}

const setUpGuild = async guild => {
    const defaultChannelId = guild.channels.cache.first().id;

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
        verificationChannel: defaultChannelId,
        verificationLogChannel: defaultChannelId,
    });
}

const configGuild = async (msg, p) => {
    if (msg.content === `${p}config`) {
        return configHelp(msg, p);
    } else {
        return config.configGuild(msg, db);
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
        const buffer = renders.characterListVisualization(realmEyeData, items);
        const attachment = new Discord.MessageAttachment(buffer, "characterList.png");
        msg.channel.send(`Here are ${ign}'s characters and account info:`, attachment);
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
        const testing = false;
        if (testing) {
            if (msg.guild && !(msg.guild.id === "708761992705474680")) {
                return false;
            }
        }

        // const embeded = new Discord.MessageEmbed()
        //     .setColor("#6c17d4")
        //     .setTitle("Testing")
        //     .addField("Numbers", "1, 2, 3, 4, 5")
        //     .setDescription(`This is a response to ${msg.content}.`)
        //     .setFooter("Iris Bot", client.user.avatarURL());
        // msg.reply(embeded);

        if (msg.guild) {
            const p = await tools.getPrefix(msg.guild.id, db);
            if (!msg.content.startsWith(p)) {
                return false;
            }

            if (msg.content.startsWith(`${p}help`)) {
                helpCommand(msg, p);

            } else if (msg.content.startsWith(`${p}config`)) {
                return configGuild(msg, p).then(() => {
                    return true;
                });

            } else if (msg.content.startsWith(`${p}verify`)) {
                verification.beginVerification(msg, db).then(() => {
                    msg.delete();
                    return true;
                });

            } else if (msg.content.startsWith(`${p}characters`)) {
                listCharacters(msg, p);

            } else if (msg.content.startsWith(`${p}ppe`)) {
                ppe(msg);
            }
        }

        if ((msg.content.startsWith("!verify")) && (msg.channel.type === "dm")) {
            return verification.checkForVerification(msg, client, db);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);