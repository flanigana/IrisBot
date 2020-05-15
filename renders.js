const axios = require("axios");
const Discord = require("discord.js");
const Canvas = require("canvas");
const { Image } = require("canvas");
const Jimp = require("jimp");

const tools = require("./tools");

const getDefinitions = async definitionsUrl => {

    return axios.get(definitionsUrl).then(response => {
        let definitionData = response.data;

        // uncomment line below to test a subset of items for quicker loads
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
                name: name.toLowerCase(),
                startX: startX,
                startY: startY,
            });
        }

        return definitions;
    }).catch(console.error);
}

const getDefaultClassSkinUrl = className => {
    const classSkins = ["https://www.realmeye.com/s/a/img/wiki/Rogue.PNG", "https://www.realmeye.com/s/a/img/wiki/Archer_0.PNG", "https://www.realmeye.com/s/a/img/wiki/Wizard_0.PNG",
            "https://www.realmeye.com/s/a/img/wiki/Priest_1.PNG", "https://www.realmeye.com/s/a/img/wiki/Warrior_1.PNG", "https://www.realmeye.com/s/a/img/wiki/Knight_1.PNG",
            "https://www.realmeye.com/s/a/img/wiki/Paladin.PNG", "https://www.realmeye.com/s/a/img/wiki/assassin_0.PNG", "https://www.realmeye.com/s/a/img/wiki/Necromancer.png",
            "https://www.realmeye.com/s/a/img/wiki/Huntress.png", "https://www.realmeye.com/s/a/img/wiki/Mystic_0.png", "https://www.realmeye.com/s/a/img/wiki/Trickster_0.PNG",
            "https://www.realmeye.com/s/a/img/wiki/Sorcerer_0.png", "https://www.realmeye.com/s/a/img/wiki/ninja_3.png", "https://i.imgur.com/fCSXHwv.png"];
    let skinUrl = classSkins[tools.classEnumerator(className)];
    return skinUrl;
}

module.exports.loadRenders = async (rendersUrl, definitionsUrl) => {
    let promises = [];
    let items = {};

    // load all items from RealmEye renders image
    promises.push(getDefinitions(definitionsUrl).then(definitions => {
        return Jimp.read(rendersUrl).then(renders => {
            
            for (definition of definitions) {
                const name = definition.name;
                promises.push(renders.clone().crop(definition.startX+6, definition.startY+6, 34, 34).getBufferAsync("image/png").then(buffer => {
                    const item = new Image();
                    item.src = buffer;
                    items[`"${name}"`] = item;
                    return true;
                }).catch(console.error));
            }
        });
    }));

    // load fame icon
    promises.push(Canvas.loadImage("./fame-icon.png").then(image => {
        items["fame icon"] = image;
        return true;
    }));

    // load star icons
    const starsUrl = "https://www.realmeye.com/s/e0/img/stars-transparent.png";
    Jimp.read(starsUrl).then(starRenders => {

        const stars = ["light blue", "blue", "red", "orange", "yellow", "white"];
        for (let i=0; i < stars.length; i++) {
            const starName = stars[i];
            promises.push(starRenders.clone().crop(0, 24*i, 24, 24).getBufferAsync("image/png").then(buffer => {
                const item = new Image();
                item.src = buffer;
                items[`"${starName} star icon"`] = item;
                return true;
            }).catch(console.error));
        }

    }).catch(console.error);

    // load default skin images
    const classes = ["rogue", "archer", "wizard", "priest", "warrior", "knight", "paladin", "assassin", "necromancer", "huntress", "mystic", 
    "trickster", "sorcerer", "ninja", "samurai"];
    for (let i=0; i < classes.length; i++) {
        const skinUrl = getDefaultClassSkinUrl(classes[i]);
        promises.push(Jimp.read(skinUrl).then(image => {
            return image.getBufferAsync("image/png").then(buffer => {
                const item = new Image();
                item.src = buffer;
                items[`"${classes[i]} classic skin"`] = item;
                return true;

        }).catch(console.error);
        }).catch(console.error));
    }

    return Promise.all(promises).then(() => {
        console.log("All images loaded.");
        return items;
    });
}

module.exports.characterListVisualization = (realmEyeData, items) => {
    const characters = realmEyeData.characters;
    const sizing = 75;
    const spacing = sizing + 5;
    const fontSize = (2*sizing)/3;
    const canvasWidth = 1050 + (sizing * 7);
    const canvasHeight = characters.length >= 5 ? (50 + (characters.length * spacing)) : (50 + (5 * spacing));

    const canvas = Canvas.createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#262630";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = '#ffffff';

    for (let i=0; i < characters.length; i++) {
        const character = characters[i];

        // character maxed stats
        ctx.fillText(character.stats, ((sizing/2)-10), (sizing/2 + fontSize + (spacing * i)));

        // character skin (default for now)
        ctx.drawImage(items[`"${character.class.toLowerCase()} classic skin"`], (sizing/2 + spacing), (sizing/2 + (spacing * i)), sizing, sizing);

        // character equipment
        const equipment = character.equipment;
        for (let j=0; j < equipment.length; j++) {
            let itemImage = items[`"${equipment[j].toLowerCase()}"`];
            if (!itemImage) {
                itemImage = items[`"empty slot"`];
                // itemImage = items[`"marid pet skin"`];
            }
            ctx.drawImage(itemImage, (sizing/2 + (spacing * (j+2))), (sizing/2 + (spacing * i)), sizing, sizing);
        }

        // character fame
        ctx.drawImage(items["fame icon"], (sizing/2 + (spacing * 7)), (sizing/2 + (spacing * i)), sizing, sizing);
        ctx.fillText(`${character.fame}`, (sizing/2 + (spacing * 8)) + 5, (sizing/2 + fontSize + (spacing * i)));
    }

    // side bar creation
    const charactersClear = 350;
    ctx.fillStyle = "#383847";
    ctx.fillRect((sizing/2 + (spacing * 7) + charactersClear-50), 0, canvasWidth, canvasHeight);

    ctx.fillStyle = "#ffffff";

    const starColor = tools.getStarColor(realmEyeData.rank);
    ctx.fillText(`${realmEyeData.name}`, (sizing/2 + (spacing * 7) + charactersClear) , (sizing/2 + fontSize));

    // rank info
    ctx.fillText(`Rank:`, (sizing/2 + (spacing * 7) + charactersClear) , ((sizing/2 + fontSize) + (spacing * 1)));
    ctx.drawImage(items[`"${starColor} star icon"`], (sizing/2 + (spacing * 7) + charactersClear) + 135, (sizing/2 + (spacing * 1) - 10), sizing, sizing);
    ctx.fillText(`${realmEyeData.rank}`, (sizing/2 + (spacing * 7) + charactersClear) + 210, ((sizing/2 + fontSize) + (spacing * 1)));


    // alive fame info
    ctx.fillText(`Alive Fame:`, (sizing/2 + (spacing * 7) + charactersClear) , ((sizing/2 + fontSize) + (spacing * 2)));
    ctx.drawImage(items["fame icon"], (sizing/2 + (spacing * 7) + charactersClear) + 290, (sizing/2 + (spacing * 2)), sizing, sizing);
    ctx.fillText(`${realmEyeData.fame}`, (sizing/2 + (spacing * 7) + charactersClear) + 375, ((sizing/2 + fontSize) + (spacing * 2)));

    ctx.fillText(`Characters: ${characters.length}`, (sizing/2 + (spacing * 7) + charactersClear) , ((sizing/2 + fontSize) + (spacing * 3)));
    ctx.fillText(`${realmEyeData.guild}: ${realmEyeData.guildRank}`, (sizing/2 + (spacing * 7) + charactersClear) , ((sizing/2 + fontSize) + (spacing * 4)));


    return canvas.toBuffer("image/png");
}

module.exports.getCharactersAttachment = async (ign, items) => {
    return tools.getRealmEyeInfo(ign).then(realmEyeData => {
        if (!realmEyeData) {
            msg.reply("there was trouble finding that player on RealmEye...");
            return false;
        }

        const buffer = this.characterListVisualization(realmEyeData, items);
        return attachment = new Discord.MessageAttachment(buffer, "characterList.png");
    }).catch(console.error);
}