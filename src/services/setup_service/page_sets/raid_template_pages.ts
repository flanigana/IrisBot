import container from '../../../../inversify.config';
import { TYPES } from '../../../types';
import { PageSet } from '../pages/page_set';
import { DynamicPage, DynamicRepeatedPage } from '../pages/page';
import { MessageParser } from '../../../utilities/message_parser';
import { IRaidTemplate } from '../../../models/templates/raid_template';
import { MessageEmbed } from 'discord.js';
import { RaidTemplateService } from '../../raid_template_service';
import { ClientTools } from '../../../utilities/client_tools';

export default function addRaidTemplatePages(pageSet: PageSet<IRaidTemplate>, template: Partial<IRaidTemplate>, guildId: string) {
    const raidTemplateService = container.get<RaidTemplateService>(TYPES.RaidTemplateService);
    const clientTools = container.get<ClientTools>(TYPES.ClientTools);
    const availableEmojiList = clientTools.createClientEmojisList(guildId);

    function existingTemplateNames(): Promise<string[]> {
        return raidTemplateService.findTemplatesByGuildId(guildId).then((templates: IRaidTemplate[]) => {
            return templates.map((t: IRaidTemplate) => t.name);
        });
    }

    // Name
    pageSet.addPage(new DynamicPage(
        {name: template.name},
        async (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
            const existingTemplates = await existingTemplateNames();
            let embed: MessageEmbed = clientTools.getStandardEmbed()
                .setTitle('Set Name')
                .setDescription('Respond with the name you would like to use for this raid template. It cannot be the same name as an existing template. ' +
                '\n**Note:** If you wish to include spaces in your template name, the entire name must be enclosed in quotes when using it (ie "Template Name")!');
            clientTools.addFieldToEmbed(embed, 'Example', '\`Void\`');
            clientTools.addFieldToEmbed(embed, 'Template Name', fields.name ? fields.name : 'Unset', true);
            clientTools.addFieldToEmbed(embed, 'Existing Template Names', existingTemplates, true);
            return Promise.resolve(embed);
        },
        async (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
            res = res.replace(/[^\w\d ]/g, '');
            return raidTemplateService.existsByName(guildId, res, false).then((exists) => {
                if (exists) {
                    return `Error: Template with the name ${res} already exists!`;
                } else {
                    fields.name = res;
                    return 'Successfully updated template name!';
                }
            });
        }
    ));
    // Description
    pageSet.addPage(new DynamicPage(
        {description: template.description},
        (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
            let embed: MessageEmbed = clientTools.getStandardEmbed()
                .setTitle('Set Description')
                .setDescription('Respond with the description you would like displayed when you use this raid template. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`This will be a Void. Please react with the appropriate class/ability reactions. ' +
            'We will need at least two <vialkey> reacts before starting.\`');
            clientTools.addFieldToEmbed(embed, 'Template Description', fields.description ? fields.description : 'Unset');
            return Promise.resolve(embed);
        },
        (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
            fields.description = clientTools.replaceWithEmojis(res, guildId);
            return Promise.resolve('Successfully updated template description!');
        }
    ));
    // Primary React
    pageSet.addPage(new DynamicPage(
        {primaryReact: template.primaryReact},
        (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
            let embed: MessageEmbed = clientTools.getStandardEmbed()
                .setTitle('Set Primary React')
                .setDescription('Respond with the emoji you would like raiders to react with to be counted in the raid. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<losthallsportal>\`');
            clientTools.addFieldToEmbed(embed, 'Template Primary React', fields.primaryReact ? fields.primaryReact : 'Unset');
            return Promise.resolve(embed);
        },
        (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
            const emoji = clientTools.getEmoji(res, guildId);
            if (!emoji) {
                return Promise.resolve(`Error: Invalid emoji format or no emoji with the name, ${res} found!`);
            } else {
                fields.primaryReact = `${emoji}`;
                return Promise.resolve('Successfully updated primary react!');
            }
        }
    ));
    let secondaryParts: Partial<IRaidTemplate>[] = [];
    for (let i=0; i<template.secondaryReacts.length; i++) {
        secondaryParts.push({
            secondaryReacts: template.secondaryReacts[i],
            secondaryReactLimits: template.secondaryReactLimits[i]
        });
    }
    // Secondary Reacts
    pageSet.addPage(new DynamicRepeatedPage(
        secondaryParts,
        (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
            let embed: MessageEmbed = clientTools.getStandardEmbed()
                .setTitle('Set Secondary React')
                .setDescription('Respond with the emoji you would like raiders to react with to be confirmed by the bot. Respond with an emoji *and* a number ' +
                'to specify a max number of confirmations allowed for the react. If this number is 0, there will be no max. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<losthallskey>\` or \`<losthallskey> 3\`');
            clientTools.addFieldToEmbed(embed, 'Template Secondary React', fields.secondaryReacts ? fields.secondaryReacts : 'Unset', true);
            clientTools.addFieldToEmbed(embed, 'React Limit', `${fields.secondaryReactLimits}`, true);
            return Promise.resolve(embed);
        },
        (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
            const args = MessageParser.parseMessage(res);
            const emoji = clientTools.getEmoji(args[0], guildId);
            if (!emoji) {
                return Promise.resolve(`Error: Invalid emoji format or no emoji with the name, ${args[0]} found!`);
            } else {
                fields.secondaryReacts = `${emoji}`;
                let num = 0;
                if (args.length > 1) {
                    num = MessageParser.parseNumber(args[1]);
                    num = num >= 0 ? num : 0;
                }
                fields.secondaryReactLimits = num;
                return Promise.resolve('Successfully updated secondary react!');
            }
        },
        {secondaryReacts: '', secondaryReactLimits: 0}
    ));
    // General Reacts
    pageSet.addPage(new DynamicPage(
        {additionalReacts: template.additionalReacts},
        (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
            let embed: MessageEmbed = clientTools.getStandardEmbed()
                .setTitle('Set Additional Reacts')
                .setDescription('Respond with any additional emojis you would like raiders to react with. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<warriorclass> <knightclass> <paladinclass> <ogmurability> <marblesealability>\`');
            clientTools.addFieldToEmbed(embed, 'Template Additional Reacts', fields.additionalReacts.length > 0 ? fields.additionalReacts : 'None');
            return Promise.resolve(embed);
        },
        (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
            const args = MessageParser.parseMessage(res);
            const reacts = args.map((arg: string) => {
                const emoji = clientTools.getEmoji(arg, guildId);
                return emoji ? `${emoji}`: undefined;
            }).filter((emoji: string) => emoji !== undefined);

            if (reacts.length === 0) {
                return Promise.resolve('Error: No valid emojis given!');
            } else {
                fields.additionalReacts = reacts;
                return Promise.resolve('Successfully updated additional reacts!');
            }
        }
    ));
}