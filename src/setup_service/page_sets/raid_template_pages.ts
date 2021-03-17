import container from '../../../inversify.config';
import { TYPES } from '../../types';
import { PageSet } from '../pages/page_set';
import { DynamicPage, DynamicRepeatedPage } from '../pages/page';
import { MessageParser } from '../../utilities/message_parser';
import { IRaidTemplate } from '../../models/raid_template';
import { MessageEmbed } from 'discord.js';
import { RaidTemplateService } from '../../services/raid_template_service';
import { ClientTools } from '../../utilities/client_tools';

export default function addRaidTemplatePages(pageSet: PageSet<IRaidTemplate>, template: Partial<IRaidTemplate>, guildId: string): void {
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
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Name')
                .setDescription('Respond with the name you would like to use for this raid template. It cannot be the same name as an existing template. ' +
                '\n**Note:** If you wish to include spaces in your template name, the entire name must be enclosed in quotes when using it (ie "Template Name")!');
            clientTools.addFieldToEmbed(embed, 'Example', '\`Void\`');
            clientTools.addFieldToEmbed(embed, 'Template Name', fields.name, {inline: true, default: 'Unset'});
            clientTools.addFieldToEmbed(embed, 'Existing Template Names', existingTemplates, {inline: true});
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
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Description')
                .setDescription('Respond with the description you would like displayed when you use this raid template. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`This will be a Void. Please react with the appropriate class/ability reactions. ' +
            'We will need at least two <vialkey> reacts before starting.\`');
            clientTools.addFieldToEmbed(embed, 'Template Description', fields.description, {default: 'Unset'});
            return embed;
        },
        (fields: Partial<IRaidTemplate>, res: string): string => {
            fields.description = clientTools.replaceWithEmojis(res, guildId);
            return 'Successfully updated template description!';
        }
    ));
    // Primary React
    pageSet.addPage(new DynamicPage(
        {primaryReact: template.primaryReact},
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Primary React')
                .setDescription('Respond with the emoji you would like raiders to react with to be counted in the raid. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<losthallsportal>\`');
            clientTools.addFieldToEmbed(embed, 'Template Primary React', fields.primaryReact, {default: 'Unset'});
            return embed;
        },
        (fields: Partial<IRaidTemplate>, res: string): string => {
            const emoji = clientTools.getEmoji(res, guildId);
            if (!emoji) {
                return `Error: Invalid emoji format or no emoji with the name, ${res} found!`;
            } else {
                fields.primaryReact = emoji.toString();
                return 'Successfully updated primary react!';
            }
        }
    ));
    // Secondary Reacts
    let secondaryParts = [];
    for (let i=0; i<template.secondaryReacts.length; i++) {
        secondaryParts.push({
            secondaryReacts: template.secondaryReacts[i],
            secondaryReactLimits: template.secondaryReactLimits[i]
        });
    }
    pageSet.addPage(new DynamicRepeatedPage(
        secondaryParts,
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Secondary React')
                .setDescription('Respond with the emoji you would like raiders to react with to be confirmed by the bot. Respond with an emoji *and* a number ' +
                'to specify a max number of confirmations allowed for the react. If this number is 0, there will be no max. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<losthallskey>\` or \`<losthallskey> 3\`');
            clientTools.addFieldToEmbed(embed, 'Template Secondary React', fields.secondaryReacts, {inline: true, default: 'Unset'});
            clientTools.addFieldToEmbed(embed, 'React Limit', `${fields.secondaryReactLimits}`, {inline: true});
            return embed;
        },
        (fields: any, res: string): string => {
            const args = MessageParser.parseMessage(res);
            const emoji = clientTools.getEmoji(args[0], guildId);
            if (!emoji) {
                return `Error: Invalid emoji format or no emoji with the name, ${args[0]} found!`;
            } else {
                fields.secondaryReacts = emoji.toString();
                let num = 0;
                if (args.length > 1) {
                    num = MessageParser.parseNumber(args[1]);
                    num = num >= 0 ? num : 0;
                }
                fields.secondaryReactLimits = num;
                return 'Successfully updated secondary react!';
            }
        },
        {secondaryReacts: '', secondaryReactLimits: 0}
    ));
    // General Reacts
    pageSet.addPage(new DynamicPage(
        {additionalReacts: template.additionalReacts},
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Additional Reacts')
                .setDescription('Respond with any additional emojis you would like raiders to react with. ' +
                'Below is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<warriorclass> <knightclass> <paladinclass> <ogmurability> <marblesealability>\`');
            clientTools.addFieldToEmbed(embed, 'Template Additional Reacts', fields.additionalReacts, {default: 'None'});
            return embed;
        },
        (fields: Partial<IRaidTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            const reacts = args.map((arg: string) => {
                const emoji = clientTools.getEmoji(arg, guildId);
                return emoji ? emoji.toString() : undefined;
            }).filter((emoji: string) => emoji !== undefined);

            if (reacts.length === 0) {
                return 'Error: No valid emojis given!';
            } else {
                fields.additionalReacts = reacts;
                return 'Successfully updated additional reacts!';
            }
        }
    ));
}