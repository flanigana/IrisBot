import container from '../../../inversify.config';
import { TYPES } from '../../types';
import { PageSet } from '../pages/page_set';
import { DynamicPage } from '../pages/page';
import { MessageParser } from '../../utilities/message_parser';
import { IRaidTemplate, RaidReact, raidReactsToStringArray } from '../../models/raid_template';
import { MessageEmbed } from 'discord.js';
import { RaidTemplateService } from '../../services/raid_template_service';
import { ClientTools } from '../../utilities/client_tools';

export default function addRaidTemplatePages(pageSet: PageSet<IRaidTemplate>, template: Partial<IRaidTemplate>, guildId: string): void {
    const raidTemplateService = container.get<RaidTemplateService>(TYPES.RaidTemplateService);
    const clientTools = container.get<ClientTools>(TYPES.ClientTools);
    const availableEmojiList = clientTools.createClientEmojisList(guildId);

    function getExistingTemplateNames(): Promise<string[]> {
        return raidTemplateService.findTemplatesByGuildId(guildId).then((templates: IRaidTemplate[]) => {
            return templates.filter(t => !t._id.equals(template._id)).map(t => t.name);
        });
    }

    // Name
    pageSet.addPage(new DynamicPage<IRaidTemplate>(
        {name: template.name},
        async (fields: Partial<IRaidTemplate>): Promise<MessageEmbed> => {
            const existingTemplates = await getExistingTemplateNames();
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Name')
                .setDescription('Respond with the name you would like to use for this raid template. It cannot be the same name as an existing template. ' +
                '\n**Note:** If you wish to include spaces in your template name, the entire name must be enclosed in quotes when using it (ie "Template Name")!');
            clientTools.addLineBreakFieldToEmbed(embed);
            clientTools.addFieldToEmbed(embed, 'Example', '\`Void\`');
            clientTools.addFieldToEmbed(embed, 'Template Name', fields.name, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Other Template Names', existingTemplates, {default: 'None', inline: true});
            return embed;
        },
        async (fields: Partial<IRaidTemplate>, res: string): Promise<string> => {
            res = res.replace(/[^\w\d ]/g, '');
            const existingTemplates = await getExistingTemplateNames();
            if (existingTemplates.includes(res)) {
                return `Error: Template with the name ${res} already exists!`;
            } else {
                fields.name = res;
                return 'Successfully updated template name!';
            }
        }
    ));

    // Description
    pageSet.addPage(new DynamicPage<IRaidTemplate>(
        {description: template.description},
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Description')
                .setDescription('Respond with the description you would like displayed when you use this raid template. ' +
                '\n\nBelow is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addLineBreakFieldToEmbed(embed);
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
    pageSet.addPage(new DynamicPage<IRaidTemplate>(
        {primaryReact: template.primaryReact},
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Primary React')
                .setDescription('Respond with the emoji you would like raiders to react with to be counted in the raid. ' +
                '\n\nBelow is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addLineBreakFieldToEmbed(embed);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<losthallsportal>\`');
            clientTools.addFieldToEmbed(embed, 'Template Primary React', fields.primaryReact.react, {default: 'Unset'});
            return embed;
        },
        (fields: Partial<IRaidTemplate>, res: string): string => {
            const emoji = clientTools.getEmoji(res, guildId);
            if (!emoji) {
                return `Error: Invalid emoji format or no emoji with the name, ${res} found!`;
            } else {
                fields.primaryReact = {react: emoji.toString()};
                return 'Successfully updated primary react!';
            }
        }
    ));

    // Secondary Reacts
    pageSet.addPage(new DynamicPage<IRaidTemplate>(
        {secondaryReacts: template.secondaryReacts},
        (fields: IRaidTemplate): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Secondary React')
                .setDescription('Respond with the emojis you would like raiders to react with to be confirmed by the bot. Respond with an emoji *and* ' +
                'a number to specify a max number of confirmations allowed for the react. If this number is omited or is 0, there will be no max. ' +
                '\nYou may respond with multiple reacts in case of things like Void (key and vial) or O3 (inc and runes)' +
                '\n\nBelow is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<losthallskey>\` or \`<losthallskey> 3\` or \`<losthallskey> 1 <vialkey> 3\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`');
            clientTools.addFieldToEmbed(embed, 'Secondary Reacts: Limits', raidReactsToStringArray(fields.secondaryReacts), {default: 'None', separator: '\n'});
            return embed;
        },
        (fields: IRaidTemplate, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.secondaryReacts = [];
                return 'Successfully removed all secondary reacts.'
            }
            const reacts:RaidReact[] = [];
            let emoji = '';
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num)) { // is num
                    if (!emoji) { // if num did not come after emoji
                        return 'Error: Unexpected input formatting. Please look at the example and try again.';
                    }
                    reacts.push({react: emoji, limit: num});
                    emoji = '';
                } else {
                    if (emoji) { // if last arg was emoji, add with 0 limit
                        reacts.push({react: emoji, limit: 0});
                        emoji = '';
                    }
                    emoji = clientTools.getEmoji(arg, guildId)?.toString();
                    if (!emoji) { // invalid emoji input
                        return `Error: ${arg} is not a valid emoji.`;
                    }
                }
            }
            if (emoji) {
                reacts.push({react: emoji, limit: 0});
            }
            fields.secondaryReacts = reacts;
        }
    ));

    // General Reacts
    pageSet.addPage(new DynamicPage<IRaidTemplate>(
        {additionalReacts: template.additionalReacts},
        (fields: Partial<IRaidTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Set Additional Reacts')
                .setDescription('Respond with any additional emojis you would like raiders to react with. These have no use by the bot ' +
                'but are useful to know what classes or abilities raiders may bring.' +
                '\n\nBelow is a list of emojis available for use.' +
                '\n**Emoji Note:** To use any emoji that is ***not*** in **this** guild but ***is*** in the following list, you ***must*** type the name as \`<emojiname>\`.');
            clientTools.addEmojiListToEmbed(embed, availableEmojiList);
            clientTools.addLineBreakFieldToEmbed(embed);
            clientTools.addFieldToEmbed(embed, 'Example', '\`<warriorclass> <knightclass> <paladinclass> <ogmurability> <marblesealability>\`');
            clientTools.addFieldToEmbed(embed, 'Template Additional Reacts', fields.additionalReacts.map(r => r.react), {default: 'None'});
            return embed;
        },
        (fields: Partial<IRaidTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            const reacts:RaidReact[] = args.map((arg: string) => {
                const emoji = clientTools.getEmoji(arg, guildId);
                return emoji ? {react: emoji.toString()} : undefined;
            }).filter((emoji: RaidReact) => emoji !== undefined);

            if (reacts.length === 0) {
                return 'Error: No valid emojis given!';
            } else {
                fields.additionalReacts = reacts;
                return 'Successfully updated additional reacts!';
            }
        }
    ));
}