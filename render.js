const axios = require("axios");
const Discord = require("discord.js");
const Canvas = require("canvas");
const { Image } = require("canvas");
const Jimp = require("jimp");

const tools = require("./tools");

const getDefinitions = async definitionsUrl => {

    return axios.get(definitionsUrl).then(response => {
        let definitionData = response.data;

        // uncomment line below to test a subset of renders for quicker loads
        // definitionData = definitionData.substring(0, 486) + "};";

        definitionData = definitionData.substring(7, definitionData.length-2);
        let splits = definitionData.split(":[");
        let definitions = [];

        for (let i=1; i<splits.length; i++) {
            splits[i] = splits[i].substring(0, splits[i].indexOf("]"));
            let info = splits[i].split(",");
            let name = info[0].substring(1, info[0].length-1);

            let startX = 0;
            let startY = 0;
            if (info.length === 3) {
                startX = parseInt(info[1]);
                startY = parseInt(info[2]);
            } else if ((info.length === 7) || (info.length === 8)) {
                startX = parseInt(info[3]);
                startY = parseInt(info[4]);
            }

            definitions.push({
                name: name,
                startX: startX,
                startY: startY,
            });
        }

        return definitions;
    }).catch(console.error);
};

module.exports.loadRenders = async (rendersUrl, definitionsUrl, classInfo) => {
    let promises = [];
    let renders = {};

    // load all renders from RealmEye renders image
    promises.push(getDefinitions(definitionsUrl).then(definitions => {
        return Jimp.read(rendersUrl).then(allRenders => {
            
            for (const definition of definitions) {
                const name = definition.name;
                promises.push(allRenders.clone().crop(definition.startX+6, definition.startY+6, 34, 34).getBufferAsync("image/png").then(buffer => {
                    const render = new Image();
                    render.src = buffer;
                    renders[name] = render;
                    return true;
                }).catch(console.error));
            }
        });
    }));

    // load fame icon
    promises.push(Canvas.loadImage("./fame-icon.png").then(image => {
        renders["Fame Icon"] = image;
        return true;
    }));

    // load star icons
    const starsUrl = "https://www.realmeye.com/s/e0/img/stars-transparent.png";
    Jimp.read(starsUrl).then(starRenders => {

        const stars = ["Light Blue", "Blue", "Red", "Orange", "Yellow", "White"];
        for (let i=0; i < stars.length; i++) {
            const starName = stars[i];
            promises.push(starRenders.clone().crop(0, 24*i, 24, 24).getBufferAsync("image/png").then(buffer => {
                const render = new Image();
                render.src = buffer;
                renders[`${starName} Star Icon`] = render;
                return true;
            }).catch(console.error));
        }

    }).catch(console.error);

    // load default skin images
    const classNames = Object.getOwnPropertyNames(classInfo);
    for (let i=0; i < classNames.length; i++) {
        const cl = classInfo[classNames[i]];
        const skinUrl = cl.defaultSkin;
        promises.push(Jimp.read(skinUrl).then(image => {
            return image.getBufferAsync("image/png").then(buffer => {
                const render = new Image();
                render.src = buffer;
                renders[`${cl.className} Default Skin`] = render;
                return true;

        }).catch(console.error);
        }));
    }

    return Promise.all(promises).then(() => {
        return renders;
    });
};

const characterListVisualization = (characters, renders, guildCharacters=false) => {
    const highestFame = tools.getHighestFame(characters);

    const sizing = 75;
    const space = 6;
    const spacing = sizing + space;
    const fontSize = (3*sizing)/4;

    // get width of highest fame and stat column in order to set width of actual canvas
    const preCanvas = Canvas.createCanvas(500, 500);
    const preCtx = preCanvas.getContext("2d");
    preCtx.font = `${fontSize}px sans-serif`;
    preCtx.fillText(`8/8`, 0, 0);
    preCtx.fillText(`${highestFame}`, 0, 0);
    const statsWidth = preCtx.measureText(`8/8`).width + 10;
    const longestFameWidth = preCtx.measureText(`${highestFame}`).width;
    const textHeightAdjustment = preCtx.measureText(`8/8`).actualBoundingBoxAscent + (preCtx.measureText(`8/8`).actualBoundingBoxDescent) + 5;
    let longestNameWidth = 0;
    if (guildCharacters) {
        for (char of characters)  {
            preCtx.fillText(`${char.name}`);
            const nameWidth = preCtx.measureText(`${char.name}`).width;
            longestNameWidth = nameWidth > longestNameWidth ? nameWidth : longestNameWidth;
        }
        longestNameWidth = longestNameWidth + 20;
    }

    // set up actual canvas
    const borderWidth = 5;
    const xMargin = 20;
    const characterElements = guildCharacters ? 6 : 7;
    const canvasWidth = xMargin + longestNameWidth + statsWidth + (characterElements * spacing) + 5 + longestFameWidth + xMargin;
    const canvasHeight = borderWidth + (characters.length * spacing) + borderWidth;
    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // background with border
    ctx.fillStyle = "#53538a";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#323245";
    ctx.fillRect(borderWidth, borderWidth, canvasWidth-(borderWidth*2), canvasHeight-(borderWidth*2));

    // alternate background color for character list
    ctx.fillStyle = `rgba(83, 83, 138, 0.3)`;
    for (let i=1; i < characters.length; i = i+2) {
        ctx.fillRect(0, borderWidth + (spacing*i), canvasWidth, spacing);
    }

    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#ffffff';

    
    let yMod = borderWidth + space/2;
    // list each character row
    for (char of characters) {
        let xMod = xMargin;

        if (guildCharacters) {
            ctx.fillText(`${char.name}`, xMod, textHeightAdjustment+yMod);
            xMod += longestNameWidth;
        }

        // character maxed stats
        ctx.fillText(char.stats, xMod, textHeightAdjustment+yMod);
        xMod += statsWidth;

        // character skin (default for now)
        let renderImage = renders[`${char.class} Default Skin`];
        if (!renderImage) {
            renderImage = renders[`Empty slot`];
        }

        ctx.drawImage(renderImage, xMod, yMod, sizing, sizing);
        xMod += spacing;

        // character equipment
        const equipment = char.equipment;
        for (const equip of equipment) {
            let renderImage = renders[`${equip}`];
            if (!renderImage) {
                renderImage = renders[`Empty slot`];
            }
            ctx.drawImage(renderImage, xMod, yMod, sizing, sizing);
            xMod += spacing;
        }

        if (!guildCharacters) {
            // if character has no backpack, add empty slot
            if (equipment.length < 5) {
                ctx.drawImage(renders[`Empty slot`], xMod, yMod, sizing, sizing);
                xMod += spacing;
            }
        }

        // character fame
        ctx.drawImage(renders["Fame Icon"], xMod, yMod, sizing, sizing);
        xMod += spacing + 5;
        ctx.fillText(`${char.fame}`, xMod, textHeightAdjustment+yMod);
        yMod += spacing;
    }

    return canvas.toBuffer("image/png");
};

const characterListEmbed = (client, realmEyeData, renders) => {
    let starColor = tools.getStarColor(realmEyeData.rank);
    if (starColor === "light blue") {
        starColor = "lightblue";
    }
    const starEmoji = tools.getEmoji(client, `${starColor}star`);
    const rankText = `${starEmoji}${realmEyeData.rank}`;
    const fameEmoji = tools.getEmoji(client, "fameicon");
    const fameText = `${fameEmoji} ${realmEyeData.fame}`;
    const guildRankEmoji = tools.getEmoji(client, `${realmEyeData.guildRank.toLowerCase()}rank`);
    const guildRankText = `${guildRankEmoji} ${realmEyeData.guildRank}`;

    let attachment = null;
    if (!realmEyeData.hiddenCharacters && (realmEyeData.charactersCount > 0)) {
        const buffer = characterListVisualization(realmEyeData.characters, renders);
        attachment = new Discord.MessageAttachment(buffer, "characterList.png");
    }

    let embed = tools.getStandardEmbed(client)
        .setTitle(`${realmEyeData.name}'s RealmEye Data`)
        .setURL(`https://www.realmeye.com/player/${realmEyeData.name}`)
        .setDescription(`${realmEyeData.description}`)
        .addFields(
            {name: "User", value: `${realmEyeData.name}`, inline: true},
            {name: "Characters", value: `${!realmEyeData.hiddenCharacters ? realmEyeData.charactersCount : "Hidden"}`, inline: true},
            {name: "Guild", value: `${realmEyeData.guild != "" ? realmEyeData.guild : "-----"}`, inline: true},
            {name: "Rank", value: `${rankText}`, inline: true},
            {name: "Alive Fame", value: `${!realmEyeData.hiddenCharacters ? fameText : "Hidden"}`, inline: true},
            {name: "Guild Rank", value: `${realmEyeData.guildRank != "" ? guildRankText : "-----"}`, inline: true},
        );

    if (!realmEyeData.hiddenCharacters && (realmEyeData.charactersCount > 0)) {
        embed = embed.attachFiles(attachment)
            .setImage("attachment://characterList.png");
    }

    return embed;
};

module.exports.realmEyeDisplay = async (client, p, ign, userId, channel, db, renders) => {
    const userRegex = /<@!\d{18}>/g;

    if (ign === "") {
        ign = await tools.getUserIgn(userId, db);
        if (!ign) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("User Not Found")
                .setDescription(`You need to first verify with the bot or supply an ign using \`${p}realmEye <ign>\`
\nIf you would like to verify with the bot, either type \`${p}updateIGN\` in any channel or DM the bot with \`!updateIGN\` to begin verification.`);
            channel.send(embed);
            return false;
        }
    } else if (userRegex.test(ign)) {
        const user = ign;
        const id = ign.substring(3, 21);
        ign = await tools.getUserIgn(id, db);
        if (!ign) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("User Not Found")
                .setDescription(`${user} has not yet verified with Iris Bot. You can try using an in-game usename instead.`);
            channel.send(embed);
            return false;
        }
    }

    return tools.getRealmEyeInfo(ign, false).then(realmEyeData => {
        if (!realmEyeData.exists) {
            const embed = tools.getStandardEmbed(client)
                .setTitle(`${ign} Not Found`)
                .setDescription(`It looks like **${ign}** couldn't be found on RealmEye. The profile is either private or does not exist.`);
            channel.send(embed);
            return false;
        }
        const embed = characterListEmbed(client, realmEyeData, renders);
        channel.send(embed);
        return true;
    }).catch(console.error);
};

const guildEmbed = (client, realmEyeGuildData, renders) => {
    let attachment = null;
    if (realmEyeGuildData.topCharacters.length > 0) {
        const buffer = characterListVisualization(realmEyeGuildData.topCharacters.slice(0, 10), renders, true);
        attachment = new Discord.MessageAttachment(buffer, "characterList.png");
    }

    const members = realmEyeGuildData.members;
    let membersList = ``;
    for (const member of members) {
        if (membersList === "") {
            membersList += `${member.name}`;
        } else {
            membersList += ` | ${member.name}`;
        }
    }
    if (membersList === "") {
        membersList = "No members.";
    }

    const fameEmoji = tools.getEmoji(client, "fameicon");
    const fameText = `${fameEmoji} ${realmEyeGuildData.fame}`;

    let embed = tools.getStandardEmbed(client)
        .setTitle(`${realmEyeGuildData.name}'s RealmEye Data`)
        .setURL(`https://www.realmeye.com/guild/${tools.getGuildUrlForm(realmEyeGuildData.name)}`)
        .setDescription(`${realmEyeGuildData.description}`)
        .addFields(
            {name: "Guild", value: `${realmEyeGuildData.name}`, inline: true},
            {name: "Fame", value: `${fameText}`, inline: true},
            {name: "Server", value: `${realmEyeGuildData.server}`, inline: true},
            {name: "Characters", value: `${realmEyeGuildData.charactersCount}`, inline: true},
            {name: "Fame Rank", value: `${realmEyeGuildData.fameRank}`, inline: true},
            {name: "Server Rank", value: `${realmEyeGuildData.serverRank}`, inline: true},
            {name: `Members: ${realmEyeGuildData.membersCount}`, value: `${membersList}`},
        );

    if (!realmEyeGuildData.hiddenCharacters && (realmEyeGuildData.topCharacters.length > 0)) {
        embed = embed.attachFiles(attachment)
            .setImage("attachment://characterList.png");
    }

    return embed;
};

module.exports.guildDisplay = async (client, p, guildName, guildId, channel, db, renders) => {
    if (guildName === "") {
        guildName = await tools.getGuildName(guildId, db);
        if (!guildName) {
            const embed = tools.getStandardEmbed(client)
                .setTitle("Guild Display")
                .setDescription(`To list a guild's RealmEye information, use \`${p}guild <guildName>\`.`);
            channel.send(embed);
            return false;
        }

    }

    
    return tools.getRealmEyeGuildInfo(guildName).then(realmEyeData => {
        if (!realmEyeData.exists) {
            const embed = tools.getStandardEmbed(client)
                .setTitle(`${guildName} Not Found`)
                .setDescription(`It looks like **${guildName}** couldn't be found on RealmEye.`);
            channel.send(embed);
            return false;
        }
        const embed = guildEmbed(client, realmEyeData, renders);
        channel.send(embed);
        return true;
    }).catch(console.error);
};