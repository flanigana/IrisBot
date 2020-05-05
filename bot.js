require("dotenv").config();

const Discord = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");
const editJsonFile = require("edit-json-file");
const fs = require("fs");

const client = new Discord.Client();
let guildsConfig = editJsonFile("guilds-config.json", {autosave: true});
let pendingUsers = editJsonFile("pending-users.json", {autosave: true});

const getChannelById = (guild, id) => {
    return guild.channels.cache.find(channel => channel.id === id);
}

const getGuildById = (id) => {
    return client.guilds.cache.find(guild => guild.id === id);
}

const getChannelByName = (guild, name) => {
    return guild.channels.cache.find(channel => channel.name.toLowerCase() === name.toLowerCase());
}

const getRoleById = (guild, id) => {
    return guild.roles.cache.find(role => role.id === id);
}

const getRoleByName = (guild, name) => {
    return guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
}

const generalHelp = msg => {
    msg.reply(`\`\`\`
    Commands -
    !help : this command list
    !config : used to configure your server
    !verify : used to verify for server\`\`\``);
}

const configHelp = msg => {
    msg.reply(`\`\`\`
    Config Commands -
    !config : this command list
    !config permissions : used to set which roles can change server configuration (Note: all server admins can use config commands)
    !config guildName : used to change guild name associated with server. This is needed for verification.
    !config reqs : used to set verification requirements for server
    !config roles : used to give roles to newly verified members by using guild rank found on RealmEye
    !config allMembersRole : used to assign a common role to all verified members. This can be used in addition to guild rank roles
    !config nonMember : used to allow or deny non-guild-members to verify with the server. Useful if you want applicants to verify before being added to guild.
    !config verificationChannel : used to change server's verification channel and the verification log channel\`\`\``);
}

const helpCommand = (msg) => {
    if (msg.content === "!help") {
        generalHelp(msg);
    } else if (msg.content.startsWith("!help config")) {
        configHelp(msg);
    }
}

const setUpGuild = guild => {
    const defaultChannelId = guild.channels.cache.first().id;
    const guildId = guild.id;
    let guildConfig = {
        guildId: guild.id,
        guildName: guild.name,
        realmGuildName: undefined,
        permissions: [],
        reqs: {
            fame: 0,
            rank: 0,
            sixEight: 0,
            eightEight: 0,
            sixEightMelee: 0,
            eightEightMelee: 0,
        },
        assignRoles: false,
        allowNonMember: false,
        serverRoles: {},
        verificationChannel: defaultChannelId,
        verificationLogChannel: defaultChannelId,
    }
    guildsConfig.set(guildId, guildConfig);
}

const configPermissions = msg => {
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    const admin = guildMember.hasPermission("admin");
    if (!admin) {
        msg.reply("only a server admin can change the permissions!");
        return;
    }
    
    let split = msg.content.split(" ");
    if (split.length <=2) {

        const permissions = guildsConfig.get(`${msg.guild.id}.permissions`);
        let permissionsList = ``;
        for (roleId of permissions) {
            const role = getRoleById(msg.guild, roleId);
            if (permissionsList === "") {
                permissionsList += `${role}`;
            } else {
                permissionsList += ` ${role}`;
            }
        }
        
        msg.reply(`change configuration permissions using:
        \`!config permissions <roleName> <roleName2> <...>\`
        
        Current configuration is:
        ${permissionsList}
        (Note: all server admins have configuration permissions)`);
        return;
    }

    let messageContents = `following roles now have configuration permissions:`;
    let newPermissions = [];
    for (let i=2; i < split.length; i++) {
        let roleName = split[i].toLowerCase();
        const role = getRoleByName(msg.guild, roleName);
        if (!role) {
            msg.reply(`${roleName} is an invalid role name! Roles were not updated.`);
            return;
        }
        newPermissions.push(role.id);
        messageContents += ` ${role}`;
    }

    guildsConfig.set(`${msg.guild.id}.permissions`, newPermissions);
    msg.reply(messageContents);
}

const configGuildName = (msg, guildConfig) => {
    const guildName = msg.content.substr(18, msg.content.length);

    if (guildName.length === 0) {
        msg.reply(`change guild name by using:
        \`!config guildName <name>\`
        
        Current configuration is:
        ${guildConfig.realmGuildName}`);
        return;
    }

    guildsConfig.set(`${msg.guild.id}.realmGuildName`, guildName);
    msg.reply(`guild name changed to ${guildName}.`);
}

const configReqs = (msg, guildConfig) => {
    const reqs = msg.content.substr(13, msg.content.length);
        let split = reqs.split(" ");

        if (split[0] === "") {
            msg.reply(`must at least include a fame amount in order to update. For example:
        \`!config reqs <fame>\`
        \`!config reqs <fame> <stars>\`
        \`!config reqs <fame> <stars> <num of 6/8s> <num of 8/8s>\`
        \`!config reqs <fame> <stars> <num of 6/8s> <num of 8/8s> <num of 6/8 melees> <num of 8/8 melees>\`
            
        Current configuration is:\`\`\`fix
        Fame: ${guildConfig.reqs.fame}
        Stars: ${guildConfig.reqs.rank}
        6/8s: ${guildConfig.reqs.sixEight}
        8/8s: ${guildConfig.reqs.eightEight}
        6/8 Melees: ${guildConfig.reqs.sixEightMelee}
        8/8 Melees: ${guildConfig.reqs.eightEightMelee}\`\`\``);
            return;
        }

        let newReqs = {};
        newReqs.fame = parseInt(split[0]);

        if (split.length > 1) {
            newReqs.rank = parseInt(split[1]);
        } else {
            newReqs.rank = 0;
        }
        if (split.length > 2) {
            newReqs.sixEight = parseInt(split[2]);
        } else {
            newReqs.sixEight = 0;
        }
        if (split.length > 3) {
            newReqs.eightEight = parseInt(split[3]);
        } else {
            newReqs.eightEight = 0;
        }
        if (split.length > 4) {
            newReqs.sixEightMelee = parseInt(split[4]);
        } else {
            newReqs.sixEightMelee = 0;
        }
        if (split.length > 5) {
            newReqs.eightEightMelee = parseInt(split[5]);
        } else {
            newReqs.eightEightMelee = 0;
        }

        guildsConfig.set(`${guildId}.reqs`, newReqs);

        msg.reply(`guild requirements changed to:\`\`\`fix
        Fame: ${newReqs.fame}
        Stars: ${newReqs.rank}
        6/8s: ${newReqs.sixEight}
        8/8s: ${newReqs.eightEight}
        6/8 Melees: ${newReqs.sixEightMelee}
        8/8 Melees: ${newReqs.eightEightMelee}\`\`\``);
}

const configRoles = (msg, guildConfig) => {
    const roles = msg.content.substr(14, msg.content.length);
    let split = roles.split(" ");

    if (split[0] === "") {
        let founder = null;
        let leader = null;
        let officer = null;
        let member = null;
        let initiate = null;
        if (guildConfig.serverRoles.founder) {
            founder = getRoleById(msg.guild, guildConfig.serverRoles.founder);
            leader = getRoleById(msg.guild, guildConfig.serverRoles.leader);
            officer = getRoleById(msg.guild, guildConfig.serverRoles.officer);
            member = getRoleById(msg.guild, guildConfig.serverRoles.member);
            initiate = getRoleById(msg.guild, guildConfig.serverRoles.initiate);
        }
        msg.reply(`to configure role automatic assignment:
        To assign roles to all guild ranks:
        \`!config roles <founderRoleName> <leaderRoleName> <officerRoleName> <memberRoleName> <initiateRoleName>\`
        To turn on/off automatic role assignment:
        \`!config roles true/false\`

        Current configuration is:
        Auto-Assign Roles Based on Guild Rank? ${guildConfig.assignRoles}
        founder: ${founder}
        leader: ${leader}
        officer: ${officer}
        member: ${member}
        initiate: ${initiate}`);
        return;
    }

    if ((split[0] === "true") || (split[0] === "false")) {
        guildsConfig.set(`${msg.guild.id}.assignRoles`, split[0] === "true" ? true : false);
        msg.reply(`roles will${split[0] === "true" ? " now" : " no longer"} be auto-assigned.`);
        return;
    }

    let serverRoles = {};
    const founder = getRoleByName(msg.guild, split[0]);
    const leader = getRoleByName(msg.guild, split[1]);
    const officer = getRoleByName(msg.guild, split[2]);
    const member = getRoleByName(msg.guild, split[3]);
    const intitiate = getRoleByName(msg.guild, split[4]);
    serverRoles.founder = founder.id;
    serverRoles.leader = leader.id;
    serverRoles.officer = officer.id;
    serverRoles.member = member.id;
    serverRoles.initiate = intitiate.id;

    guildsConfig.set(`${msg.guild.id}.assignRoles`, true);
    guildsConfig.set(`${msg.guild.id}.serverRoles`, serverRoles);
    msg.reply(`auto assigned roles changed to:
    founder: ${founder}
    leader: ${leader}
    officer: ${officer}
    member: ${member}
    initiate: ${initiate}`);

}

const configAllMembersRole = (msg, guildConfig) => {
    const role = msg.content.substr(23, msg.content.length);
    let split = role.split(" ");

    if (split[0] === "") {
        let allMembersRole = null;
        if (guildConfig.serverRoles.allMembers) {
            allMembersRole = getRoleById(msg.guild, guildConfig.serverRoles.allMembers);
        }
        msg.reply(`to configure all-member role assignment:
        To give all members a common role upon verification:
        \`!config allMembersRole <allMembersRoleName>\`
        To no longer give all members a common role upon verification:
        \`!config allMembersRole false\`
        
        Current configuration is:
        Assign Common Role to All Members? ${guildConfig.giveAllMembers}
        Non-Member Role: ${allMembersRole}`);
        return;
    }

    if (((split[0] === "true") || (split[0] === "false"))) {
        guildsConfig.set(`${msg.guild.id}.giveAllMembers`, split[0] === "true" ? true : false);
        msg.reply(`members will${split[0] === "true" ? " now" : " no longer"} all recieve a common role.`);
    } else {
        const allMembers = getRoleFromName(msg.guild, split[0]);
        guildsConfig.set(`${msg.guild.id}.giveAllMembers`, true);
        guildsConfig.set(`${msg.guild.id}.serverRoles.allMembers`, allMembers.id);
        msg.reply(`all member role changed to ${allMembers}.`);
    }
}

const configNonMember = (msg, guildConfig) => {
    const role = msg.content.substr(18, msg.content.length);
    let split = role.split(" ");

    if (split[0] === "") {
        let nonMemberRole = null;
        if (guildConfig.serverRoles.nonMember) {
            nonMemberRole = getRoleById(msg.guild, guildConfig.serverRoles.nonMember);
        }
        msg.reply(`to configure non-member verification:
        To allow non-members to verify and be assigned a role:
        \`!config nonMember <nonMemberRoleName>\`
        To no longer allow non-members to verify and be assigned a role:
        \`!config nonMember false\`
        
        Current configuration is:
        Allow Non-Member Verification? ${guildConfig.allowNonMember}
        Non-Member Role: ${nonMemberRole}`);
        return;
    }

    if (((split[0] === "true") || (split[0] === "false"))) {
        guildsConfig.set(`${msg.guild.id}.allowNonMember`, split[0] === "true" ? true : false);
        msg.reply(`non-members will${split[0] === "true" ? " now" : " no longer"} be able to join.`);
    } else {
        const nonMember = getRoleFromName(msg.guild, split[0]);
        guildsConfig.set(`${msg.guild.id}.allowNonMember`, true);
        guildsConfig.set(`${msg.guild.id}.serverRoles.nonMember`, nonMember.id);
        msg.reply(`non-member role changed to ${nonMember}.`);
    }
}

const configVerificationChannel = (msg, guildConfig) => {
    const channels = msg.content.substr(28, msg.content.length);
    const split = channels.split(" ");

    if (split[0] === "") {
        let verificationChannel = getChannelById(msg.guild, guildConfig.verificationChannel);
        let logChannel = getChannelById(msg.guild, guildConfig.verificationLogChannel);
        msg.reply(`to set verification channel:
        \`!config verificationChannel <verificationChannelName>\`
        or to set verification channel and a different channel for the logs
        \`!config verificationChannel <verificationChannelName> <logChannelName>\`
        
        Current configuration is:
        Verification Channel: ${verificationChannel}
        Verification Log Channel: ${logChannel}`);
        return;
    }

    if (split.length === 1) {
        const channel = getChannelByName(msg.guild, split[0]);
        guildsConfig.set(`${msg.guild.id}.verificationChannel`, channel.id);
        guildsConfig.set(`${msg.guild.id}.verificationLogChannel`, channel.id);
        msg.reply(`verification channel changed to ${channel}.`);
    } else {
        const verificationChannel = getChannelByName(msg.guild, split[0]);
        const logChannel = getChannelByName(msg.guild, split[1]);
        guildsConfig.set(`${msg.guild.id}.verificationChannel`, verificationChannel.id);
        guildsConfig.set(`${msg.guild.id}.verificationLogChannel`, logChannel.id);
        msg.reply(`verification channel changed to ${verificationChannel} and log channel changed to ${logChannel}.`);
    }
}

const normalizeNaming = msg => {
    const split = msg.content.split(" ");
    let newContent = "";
    for (part of split) {
        let newPart = part;
        if (part.startsWith("<") && part.endsWith(">")) {
            if (part.charAt(1) === "@" && part.charAt(2) === "&") {
                const role = getRoleById(msg.guild, part.slice(3, part.length-1));
                newPart = role.name.toLowerCase();
            } else if (part.charAt(1) === "#") {
                const channel = getChannelById(msg.guild, part.slice(2, part.length-1));
                newPart = channel.name.toLowerCase();
            }
        }
        if (newContent === "") {
            newContent += newPart;
        } else {
            newContent += " " + newPart;
        }
    }

    return newContent;
}

const configGuild = msg => {
    let guildConfig = guildsConfig.get(msg.guild.id);
    const guildMember = msg.guild.members.cache.find(user => user.id === msg.author.id);
    const permissions = guildConfig.permissions;
    let hasPermission = false;
    const admin = guildMember.hasPermission("admin");

    if (!admin) {
        for (role of permissions) {
            if (guildMember.roles.cache.find(memberRole => memberRole.id === role)) {
                hasPermission = true;
                break;
            }
        }
    
        if (!hasPermission) {
            msg.reply("you do not have permission to change the server configuration!");
            return;
        }
    }

    msg.content = normalizeNaming(msg);

    if (msg.content === "!config") {
        configHelp(msg);
    } else if (msg.content.startsWith("!config permissions")) {
        configPermissions(msg);
    } else if (msg.content.startsWith("!config guildName")) {
        configGuildName(msg, guildConfig);
    } else if (msg.content.startsWith("!config reqs")) {
        configReqs(msg, guildConfig);
    } else if (msg.content.startsWith("!config roles")) {
        configRoles(msg, guildConfig);
    } else if (msg.content.startsWith("!config allMembersRole")) {
        configAllMembersRole(msg, guildConfig);
    } else if (msg.content.startsWith("!config nonMember")) {
        configNonMember(msg, guildConfig);
    } else if (msg.content.startsWith("!config verificationChannel")) {
        configVerificationChannel(msg, guildConfig);
    }
}

const getRealmEyeInfo = async ign => {
    const options = {
        url: `https://www.realmeye.com/player/${ign}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36"
        }
    }

    let accountInfo = {
        name: ign,
        fame: 0,
        rank: 0,
        guild: "",
        guildRank: "",
        lastSeen: "",
        description: "",
        characters: [],
    };

    return axios(options).then(response => {
        const html = response.data;
        const $ = cheerio.load(html);

        // get summary table
        const summaryTable = $(".summary > tbody > tr");
        for (let i=0; i < summaryTable.length; i++) {
            const row = $(summaryTable[i]).find("td");
            const rowLabel = row[0].children[0].data.toLowerCase();

            if (rowLabel === "characters") {
                accountInfo.characters = parseInt(row[1].children[0].data);

            } else if (rowLabel === "fame") {
                accountInfo.fame = parseInt(row[1].children[0].children[0].data);

            } else if (rowLabel === "rank") {
                accountInfo.rank = parseInt(row[1].children[0].children[0].data);

            } else if (rowLabel === "guild") {
                accountInfo.guild = row[1].children[0].children[0].data;
                
            } else if (rowLabel === "guild rank") {
                accountInfo.guildRank = row[1].children[0].data;
                
            } else if (rowLabel === "last seen") {
                if (row[1].children[0].data) {
                    accountInfo.lastSeen = row[1].children[0].data;
                } else {
                    accountInfo.lastSeen = row[1].children[0].children[0].data;
                    accountInfo.lastSeen += row[1].children[1].data;
                }
            }
        }

        // get description
        const description = $(".description-line");
        for (let i=0; i < description.length; i++) {
            if (description[i].children[0]) {
                accountInfo.description += description[i].children[0].data + "\n";
            }
        }

        // get character table
        const characters = $(".table-responsive > .table > tbody > tr");
        let characterList = [];
        for (let i=0; i < characters.length; i++) {
            let character = {
            };

            const characterRow = characters[i];
            character.class = characterRow.children[2].children[0].data;
            character.fame = parseInt(characterRow.children[5].children[0].data);
            character.stats = characters[i].children[9].children[0].children[0].data;

            // get equipment
            const equipment = characters[i].children[8].children;
            let characterEquipment = [];
            for (let j=0; j < equipment.length; j++) {
                let item = {};
                item.imageUrl = equipment[j].children[0].attribs.href;
                if (equipment[j].children[0].attribs.title) {
                    item.itemName = "empty slot";
                } else {
                    item.itemName = equipment[j].children[0].children[0].attribs.title;
                }
                characterEquipment.push(item);
            }
            character.equipment = characterEquipment;

            characterList.push(character);
        }
        accountInfo.characters = characterList;

        return accountInfo;

    }).catch(console.error);
}

const isMelee = className => {
    if (className.toLowerCase() === "knight") {return true}
    if (className.toLowerCase() === "warrior") {return true}
    if (className.toLowerCase() === "paladin") {return true}
    return false;
}

const meetsReqs = (guildReqs, realmEye) => {
    if (realmEye.fame < guildReqs.fame) {return false;}
    if (realmEye.rank < guildReqs.rank) {return false;}
    let sixEights = 0;
    let eightEights = 0;
    let sixEightMelees = 0;
    let eightEightMelees = 0;
    for (character of realmEye.characters) {
        if ((character.stats === "6/8") || (character.stats === "7/8")) {
            sixEights++;
            if (isMelee(character.class)) {
                sixEightMelees++;
            }
        } else if ((character.stats === "8/8")) {
            eightEights++;
            if (isMelee(character.class)) {
                eightEightMelees++;
            }
        }
    }
    if (sixEights < guildReqs.sixEight) {return false;}
    if (eightEights < guildReqs.eightEight) {return false;}
    if (sixEightMelees < guildReqs.sixEightMelee) {return false;}
    if (eightEightMelees < guildReqs.eightEightMelee) {return false;}
    return true;
}

const beginVerification = msg => {
    const guildConfig = guildsConfig.get(msg.guild.id);
    if (msg.channel != guildConfig.verificationChannel) {
        return;
    }

    let veriCode = null;
    let guildId = msg.guild.id;
    let userId = msg.author.id;
    let user = {
        userId: userId,
        pending: [],
    }

    let exists = false;

    let currentUser = pendingUsers.get(userId);
    if (currentUser) {
        user.pending = currentUser.pending.slice(0, currentUser.pending.length);
        for (pending of user.pending) {
            if (pending.guildId === guildId) {
                veriCode = pending.veriCode;
                exists = true;
            }
        }
    }

    if (!exists) {
        veriCode = `${guildConfig.realmGuildName}_${Math.floor(Math.random() * Math.floor(1000000000000))}`;
        let currentVerification = {
            guildId: guildId,
            veriCode: veriCode,
        }
        user.pending.push(currentVerification);
    }

    pendingUsers.set(userId, user);
    msg.author.send(`Thanks for beginning your verification process with ${msg.guild.name}! Follow the steps below to complete your verification.

                    - Login to your RealmEye account and put ${veriCode} in any part of your description.
                    - Then come back here and reply with <!verify your_ign>.
                    - Once completed successfully, you'll receive a message verifying completion!`);
}

const removePendingVerification = (userId, guildId) => {
    const currentPending = pendingUsers.get(userId).pending;
    let newPending = [];

    for (pending of currentPending) {
        if (pending.guildId != guildId) {
            newPending.push(pending);
        }
    }
    pendingUsers.set(`${userId}.pending`, newPending);
}

const getRankRole = (realmEye, guildConfig) => {
    let roleId = null;
    if (guildConfig.serverRoles.founder) {
        switch (realmEye.guildRank.toLowerCase()) {
            case "founder":
                roleId = guildConfig.serverRoles.founder;
                break;
            case "leader":
                roleId = guildConfig.serverRoles.leader;
                break;
            case "officer":
                roleId = guildConfig.serverRoles.officer;
                break;
            case "member":
                roleId = guildConfig.serverRoles.member;
                break;
            case "initiate":
                roleId = guildConfig.serverRoles.initiate;
                break;
        }
    }
    return roleId;
}

const assignGuildRoles = (realmEye, guild, guildConfig, guildMember) => {
    const verificationLogChannel = getChannelById(getGuildById(guildConfig.guildId), guildConfig.verificationLogChannel);
    if (guildConfig.assignRoles) {
        const roleId = getRankRole(realmEye, guildConfig);
        if (roleId) {
            const role = guild.roles.cache.find(role => role.id === roleId);
            guildMember.roles.add(role.id);
            verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name} with role ${role}!`);
        } else {
            verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name}!`);
        }
        
    } else {
        verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name}!`);
    }
}

const assignRoles = (realmEye, guild, guildConfig, msg) => {
    const guildMember = guild.members.cache.find(user => user.id === msg.author.id);
    let verified = false;
    if ((realmEye.guild.toLowerCase() === guildConfig.realmGuildName.toLowerCase())) {
        // assign role based on guild rank
        assignGuildRoles(realmEye, guild, guildConfig, guildMember);
        // check for role to assign to all members
        if (guildConfig.giveAllMembers) {
            if (guildConfig.serverRoles.allMembers) {
                const role = getRoleById(guild, guildConfig.serverRoles.allMembers);
                guildMember.roles.add(role.id);
            }
        }
        verified = true;
        // remove pending verification
        removePendingVerification(msg.author.id, guild.id);
    // if player is not in guild, check if they can still verify
    } else if (guildConfig.allowNonMember) {
        const role = getRoleById(guild, guildConfig.serverRoles.nonMember);
        guildMember.roles.add(role.id);
        const verificationLogChannel = getChannelById(guild, guildConfig.verificationLogChannel);
        verificationLogChannel.send(`${guildMember.user} has been successfully verified as ${realmEye.name}!`);
        verified = true;
        // remove pending verification
        removePendingVerification(msg.author.id, guild.id);
    } else {
        msg.reply(`sorry you are not a guild member of ${guildConfig.realmGuildName} on RealmEye and this server does not allow for vefication of non-members.`)
    }

    if (verified) {
        guildMember.setNickname(realmEye.name).then(() => {
            msg.reply(`You have successfully verified with ${guild.name}!`);
            return true;
        }).catch(console.error);
    }
}

const checkForVerification = msg => {
    let userVerifications = pendingUsers.get(msg.author.id);
    let usersPending = userVerifications.pending;

    for (pending of usersPending) {
        const guildId = pending.guildId;
        const veriCode = pending.veriCode;

        const guild = client.guilds.cache.find(clientGuild => clientGuild.id === guildId);
        const split = msg.content.split(" ");
        const ign = split[1];
        return getRealmEyeInfo(ign).then(realmEye => {

            // if user's RealmEye description has the correct verification code
            if (realmEye.description.includes(veriCode)) {
                const guildConfig = guildsConfig.get(guildId);
                
                if (meetsReqs(guildConfig.reqs, realmEye)) {
                    assignRoles(realmEye, guild, guildConfig, msg);
                } else {
                    msg.reply(`Sorry, you don't meet the requirements for ${guildConfig.realmGuildName} of \`\`\`fix
                    Fame: ${guildConfig.reqs.fame}
                    Stars: ${guildConfig.reqs.rank}
                    6/8 charcters: ${guildConfig.reqs.sixEight}
                    8/8 characters: ${guildConfig.reqs.eightEight}
                    6/8 melees: ${guildConfig.reqs.sixEightMelee}
                    8/8 melees: ${guildConfig.reqs.eightEightMelee}\`\`\``)
                }

                return true;
            }
        }).catch(console.error);
    }
    msg.reply(`Sorry, there was trouble finding a valid verification code in your RealmEye description... Please try again.\nIf you haven't begun the verification process yet, first go to a server's verification channel with this bot and type !verify to get a verification code to verify with that server.`);
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("guildCreate", guild => {
    setUpGuild(guild);
});

client.on("message", msg => {
    if (msg.author.id != client.user.id) {

        if (msg.type != "dm") {
            if (msg.content.startsWith("!help")) {
                helpCommand(msg);
            } else if (msg.content.startsWith("!config")) {
                configGuild(msg);
            } else if (msg.content === "!verify") {
                beginVerification(msg);
                msg.delete();
            }
        }

        if ((msg.content.startsWith("!verify")) && (msg.channel.type === "dm")) {
            checkForVerification(msg);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);