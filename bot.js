require("dotenv").config();

const Discord = require("discord.js");
const admin = require("firebase-admin");
const config = require("./config");
const verification = require("./verification");

const client = new Discord.Client();
admin.initializeApp({
    credential: admin.credential.cert({
        "project_id": process.env.PROJECT_ID,
        "private_key": process.env.FIREBASE_PRIVATE_KEY,
        "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    })
});
const db = admin.firestore();

const generalHelp = msg => {
    msg.reply(`\`\`\`
    Commands -
    !help : this command list
    !config : used to configure your server
    !verify : used to verify for server
    !ppe : gives a random class name as a suggestion for a new ppe character.\`\`\``);
}

const configHelp = msg => {
    msg.reply(`\`\`\`
    Config Commands -
    !config : this command list
    !config list : used to list the current surver configuration
    !config permissions : used to set which roles can change server configuration (Note: all server admins can use config commands)
    !config guildName : used to change guild name associated with server. This is needed for verification.
    !config reqs : used to set verification requirements for server
    !config roles : used to give roles to newly verified members by using guild rank found on RealmEye
    !config allMemberRole : used to assign a common role to all verified members. This can be used in addition to guild rank roles
    !config nonMemberRole : used to allow or deny non-guild-members to verify with the server. Useful if you want applicants to verify before being added to guild.
    !config verificationChannel : used to change server's verification channel and the verification log channel\`\`\``);
}

const helpCommand = (msg) => {
    if (msg.content === "!help") {
        generalHelp(msg);
    } else if (msg.content.startsWith("!help config")) {
        configHelp(msg);
    }
}

const setUpGuild = async guild => {
    const defaultChannelId = guild.channels.cache.first().id;

    return db.collection("guilds").doc(guild.id).set({
        guildId: guild.id,
        guildOwner: guild.owner.id,
        guildName: guild.name,
        realmGuildName: null,
        permissions: [],
        fameReq: 0,
        rankReq: 0,
        sixEightReq: 0,
        eightEightReq: 0,
        sixEightMeleeReq: 0,
        eightEightMeleeReq: 0,
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


    // const guildId = guild.id;
    // let guildConfig = {
    //     guildId: guild.id,
    //     guildName: guild.name,
    //     realmGuildName: undefined,
    //     permissions: [],
    //     reqs: {
    //         fame: 0,
    //         rank: 0,
    //         sixEight: 0,
    //         eightEight: 0,
    //         sixEightMelee: 0,
    //         eightEightMelee: 0,
    //     },
    //     assignRoles: false,
    //     allowNonMember: false,
    //     serverRoles: {},
    //     verificationChannel: defaultChannelId,
    //     verificationLogChannel: defaultChannelId,
    // }
    // guildsConfig.set(guildId, guildConfig);
}

const configGuild = async msg => {
    if (msg.content === "!config") {
        return configHelp(msg);
    } else {
        return config.configGuild(msg, db);
    }
}

const ppe = msg => {
    const characterNum = Math.floor(Math.random() * 15);

    const characters = ["Rogue", "Archer", "Wizard", "Priest", "Warrior", "Knight", "Paladin", "Assassin", "Necromancer", "Huntress", "Mystic", 
            "Trickster", "Sorcerer", "Ninja", "Samurai"];

    msg.reply(`you should play ${characters[characterNum].toLowerCase()} for your next ppe!`);
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", async guild => {
    setUpGuild(guild);
});

client.on("message", async msg => {
    if (msg.author.id != client.user.id) {

        if (msg.channel.type != "dm") {
            if (msg.content.startsWith("!help")) {
                helpCommand(msg);
            } else if (msg.content.startsWith("!config")) {
                configGuild(msg).then(() => {return true});
            } else if (msg.content.startsWith("!verify")) {
                verification.beginVerification(msg, db);
                msg.delete();
            } else if (msg.content === "!ppe") {
                ppe(msg);
            }
        }

        if ((msg.content.startsWith("!verify")) && (msg.channel.type === "dm")) {
            verification.checkForVerification(msg, client, db);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);