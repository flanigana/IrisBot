import { Guild, MessageEmbed, Role } from 'discord.js';
import container from '../../../inversify.config';
import { Bot } from '../../bot';
import { IGuild } from '../../models/guild';
import { TYPES } from '../../types';
import { ClientTools } from '../../utilities/client_tools';
import { MessageParser } from '../../utilities/message_parser';
import { RolesAndChannels } from '../../utilities/role_and_channel_finder';
import { DynamicPage } from '../pages/page';
import { PageSet } from '../pages/page_set';

export default function addGuildConfigPages(pageSet: PageSet<IGuild>, template: Partial<IGuild>, guild: Guild): void {
    const clientTools = container.get<ClientTools>(TYPES.ClientTools);

    // Prefix
    pageSet.addPage(new DynamicPage(
        {prefix: template.prefix},
        (fields: Partial<IGuild>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Prefix')
                .setDescription('Respond with the prefix you would like the bot to use. This will go before every Iris Bot command.' +
                '\nAll valid prefixes are listed below.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`>\`')
            clientTools.addFieldToEmbed(embed, 'Valid Prefixes', Array.from(Bot.PREFIXES), {separator: ' | '});
            clientTools.addFieldToEmbed(embed, 'Current Prefix', fields.prefix);
            return embed;
        },
        (fields: Partial<IGuild>, res: string): string => {
            if (Bot.PREFIXES.has(res)) {
                fields.prefix = res;
                return 'Successfully updated bot prefix!';
            } else {
                return `Error: \`${res}\` is not a valid prefix`
            }
        }
    ));
    // Admins
    pageSet.addPage(new DynamicPage(
        {admins: template.admins},
        (fields: Partial<IGuild>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Admin Roles')
                .setDescription('Respond with the roles you would like to give admin permissions to. ' +
                'Bot admins have permission to alter **any** of the bot\'s configuration settings.');
            clientTools.addFieldToEmbed(embed, 'To Set a New List', '\`role1 role2\`');
            clientTools.addFieldToEmbed(embed, 'To Add Roles', '\`+role3 +role4\`');
            clientTools.addFieldToEmbed(embed, 'To Remove Roles', '\`-role1 -role2\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`')
            clientTools.addFieldToEmbed(embed, 'Admin Roles', fields.admins, {default: 'None'});
            return embed;
        },
        (fields: Partial<IGuild>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.admins = [];
                return 'Successfully removed all admin roles!';
            }
            const admins = RolesAndChannels.getUpdatedList(guild, fields.admins, args, 'role');
            if (admins.length > 0) {
                fields.admins = admins;
                return 'Successfully set admin roles!';
            } else {
                return 'Error: Failed to find at least one valid role!';
            }
        }
    ));
    // Mods
    pageSet.addPage(new DynamicPage(
        {mods: template.mods},
        (fields: Partial<IGuild>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Mod Roles')
                .setDescription('Respond with the roles you would like to give mod permissions to. ' +
                'Bot mods have permission to alter settings like verification, but not sensitive configuration settings (such as roles) or raid settings.');
            clientTools.addFieldToEmbed(embed, 'To Set a New List', '\`role1 role2\`');
            clientTools.addFieldToEmbed(embed, 'To Add Roles', '\`+role3 +role4\`');
            clientTools.addFieldToEmbed(embed, 'To Remove Roles', '\`-role1 -role2\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`')
            clientTools.addFieldToEmbed(embed, 'Mod Roles', fields.mods, {default: 'None'});
            return embed;
        },
        (fields: Partial<IGuild>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.mods = [];
                return 'Successfully removed all mod roles!';
            }
            const admins = RolesAndChannels.getUpdatedList(guild, fields.mods, args, 'role');
            if (admins.length > 0) {
                fields.mods = admins;
                return 'Successfully set mod roles!';
            } else {
                return 'Error: Failed to find at least one valid role!';
            }
        }
    ));
}