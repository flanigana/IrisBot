require("dotenv").config();

const Discord = require("discord.js");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");

const help = require("./general/help")
const tools = require("./general/tools");
const realmEyeTools = require("./general/realmEyeTools");
const config = require("./general/config");
const verification = require("./verification/verification");
const render = require("./realm/render");
const ppe = require("./realm/ppe");
const raidManager = require("./raidManager/raidManager");
const raidShorthand = require("./raidManager/raidShorthand");
const headcount = require("./raidManager/headcount");
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

const commonPrefixList = ["!", "-", ".", "+", "?", "$", ">", "/", ";", "*", "s!", "=", "m!", "!!"];
const parserServerWhitelist = ["710578568211464192", "708761992705474680", "726510098737922108"];
const realmEyeRendersUrl = "https://www.realmeye.com/s/e0/css/renders.png";
const realmEyeDefinitionsUrl = "https://www.realmeye.com/s/e0/js/definition.js";
const classInfoUrl = `https://www.realmeye.com/wiki/classes`;
let classInfo;
let renders;

/////////////////////////////////////////////////////////////////////
//**                     Command Handling                          */
/////////////////////////////////////////////////////////////////////

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
        guildOwner: guild.ownerID,
        mods: [],
        prefix: "!",
        raidLeaderRoles: [],
        raidTemplateNames: [],
        sendConfirmations: false,
        shorthandNames: [],
        verificationTemplateNames: [],
    });
};

const configGuild = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length === 0) {
        return help.configHelp(p, msg, client);
    } else {
        return config.configGuild(client, p, msg, guildConfig, commonPrefixList, db);
    }
};

const verify = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 0);
    if (args[0].toLowerCase() === "verification" && args.length === 1) {
        return help.verifyHelp(p, msg, client);
    } else if (args[0].toLowerCase() === "unverify" && args.length === 1) {
        return help.unverifyHelp(p, msg, client);
    } else {
        return verification.verification(client, p, msg, guildConfig, db);
    }
};

const manualVerify = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length < 2) {
        return help.manualVerifyHelp(p, msg, client);
    } else {
        return verification.manualVerify(client, p, msg, guildConfig, db);
    }
};

const raid = async (p, msg, guildConfig) => {
    const args = tools.getArgs(msg.content, p, 1);
    if (args.length === 0) {
        return help.raidHelp(p, msg, client);
    } else {
        return raidManager.raid(client, p, msg, guildConfig, db);
    }
};


/////////////////////////////////////////////////////////////////////
//**                      Initialization                           */
/////////////////////////////////////////////////////////////////////

const retryInitialization = async (interval) => {
    console.log(`Retrying to retrieve class info from RealmEye...`);

    return realmEyeTools.getClassInfo(classInfoUrl).then(results => {
        if (results.exists) { // successfully got class info
            clearInterval(interval);
            console.log(`Successfully retrieved class info!`);

            return true;

        } else { // still failed to get class info
            console.error(`Failed to retrieve class info again...`);

            return false;
        }

    }).then(async res => {
        if (res) {
            return render.loadRenders(realmEyeRendersUrl, realmEyeDefinitionsUrl, classInfo).then(results => {
                renders = results;

                return true;
            });

        } else {
            return false;
        }
        
    }).catch(console.error);
};

const initializeBot = async () => {

    return realmEyeTools.getClassInfo(classInfoUrl).then(results => {
        classInfo = results;
        if (classInfo.exists) { // successfully got class info
            return true;

        } else { // if getting class info fails, start an interval to try again later
            const retryInterval = 600000;
            console.error(`Failed to retrieve class info. Retrying in ${retryInterval/60000} minutes...`);
            const interval = setInterval(() => {
                retryInitialization(interval);
            }, retryInterval);

            return false;

        }

    }).then(async res => {
        if (res) {
            return render.loadRenders(realmEyeRendersUrl, realmEyeDefinitionsUrl, classInfo).then(results => {
                renders = results;
                return true;
            });
        } else {
            return false;
        }
    }).catch(console.error);
};


/////////////////////////////////////////////////////////////////////
//**                       Client Events                           */
/////////////////////////////////////////////////////////////////////

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log("Loading...");

    const startTime = Date.now();

    initializeBot().then(result => {
        if (result) {
            console.log(`Successfully initialized in ${(Date.now() - startTime) / 1000} seconds!`);
        }
    }).catch(console.error);

    // uncomment to view server and user counts
    // db.collection("guilds").get().then(console.log);
    // db.collection("users").get().then(console.log);
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
        
        if (msg.guild) { // message sent in server
            // check if message has a command prefix
            if (commonPrefixList.every(prefix => {
                    return !msg.content.startsWith(prefix);
                    })) {
                // if the message does not start with one of the common prefixes, return
                return false;
            }

            // retrieve guild config
            const guildConfig = await tools.getGuildConfig(msg.guild.id, db, msg);
            if (!guildConfig) {
                return false;
            }
            const p = guildConfig.prefix;
            const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
            
            if (!msg.content.toLowerCase().startsWith(p)) { // check that message starts with the correct command prefix
                return false;
            }

            // parse arguments
            const args = tools.getArgs(msg.content, p, 0);
            if (args.length === 0) {
                return false;
            }

            switch (args[0].toLowerCase()) { // check command and handle
                case "help":
                    help.generalHelp(p, msg, client);
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
                    ppe.ppe(msg, classInfo, client);
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
                case "hc":
                    if (tools.isAdmin(guildMember, guildConfig) || tools.isRaidLeader(guildMember, guildConfig)) {
                        headcount.headcount(client, p, msg, guildConfig, db);
                    }
                    break;
                case "parse":
                    if (parserServerWhitelist.includes(msg.guild.id)) {
                        if (tools.isAdmin(guildMember, guildConfig) || tools.isRaidLeader(guildMember, guildConfig)) {
                            if (classInfo.exists) {
                                parser.parse(client, p, msg, visionClient, guildConfig, classInfo, db);
                            } else {
                                const embed = tools.getStandardEmbed(client)
                                        .setTitle("Failed to retrieve class info from RealmEye")
                                        .setURL(classInfoUrl)
                                        .setDescription("RealmEye may be experiencing trouble right now.");
                                msg.channel.send(embed);
                            }
                        }
                    }
                    break;
            }
        } else if (msg.channel.type === "dm") { // message sent as dm to bot
            
            const args = tools.getArgs(msg.content, "!");
            switch (args[0].toLowerCase()) { // check command and handle
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