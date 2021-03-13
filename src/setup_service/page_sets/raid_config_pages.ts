import { Guild, MessageEmbed } from 'discord.js';
import container from '../../../inversify.config';
import { IRaidConfig } from '../../models/raid_config';
import { TYPES } from '../../types';
import { ClientTools } from '../../utilities/client_tools';
import { MessageParser } from '../../utilities/message_parser';
import { RolesAndChannels } from '../../utilities/role_and_channel_finder';
import { DynamicPage } from '../pages/page';
import { PageSet } from '../pages/page_set';

export default function addRaidConfigPages(pageSet: PageSet<IRaidConfig>, template: Partial<IRaidConfig>, guild: Guild): void {
    const clientTools = container.get<ClientTools>(TYPES.ClientTools);

    // Raid Leaders
    pageSet.addPage(new DynamicPage(
        {raidLeaders: template.raidLeaders},
        (fields: Partial<IRaidConfig>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Raid Leader Roles')
                .setDescription('Respond with the roles you would like to give raid leader permissions to. ' +
                'Raid leaders have permissions to control using existing raid templates.');
            clientTools.addFieldToEmbed(embed, 'To Set a New List', '\`@role1 @role2\`');
            clientTools.addFieldToEmbed(embed, 'To Add Roles', '\`+role3 +role4\`');
            clientTools.addFieldToEmbed(embed, 'To Remove Roles', '\`-role1 -role2\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`');
            clientTools.addFieldToEmbed(embed, 'Raid Leader Roles', fields.raidLeaders, {default: 'None'});
            return embed;
        },
        (fields: Partial<IRaidConfig>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.raidLeaders = [];
                return 'Successfully removed all raid leader roles!';
            }
            const raidLeaders = RolesAndChannels.getUpdatedList(guild, fields.raidLeaders, args, 'role');
            if (raidLeaders.length > 0) {
                fields.raidLeaders = raidLeaders;
                return 'Successfully set raid leader roles!';
            } else {
                return 'Error: Failed to find at least one valid role!';
            }
        }
    ));

    // Default Run Time
    const min = 60;
    const max = 1200;
    pageSet.addPage(new DynamicPage(
        {runTime: template.runTime},
        (fields: Partial<IRaidConfig>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('AFK-Check Run Time')
                .setDescription('Respond with the number of seconds you would like afk-checks to run for.' + 
                `\nThis number must be in the range of ${min}-${max}.`);
            clientTools.addFieldToEmbed(embed, 'Example', '\`300\`')
            clientTools.addFieldToEmbed(embed, 'AFK-Check Run Time', `${fields.runTime} seconds`);
            return embed;
        },
        (fields: Partial<IRaidConfig>, res: string): string => {
            let num = MessageParser.parseNumber(res);
            num = num >= min ? num : min;
            num = num <= max ? num : max;
            fields.runTime = num;
            return 'Successfully updated run time!';
        }
    ));

    // Confirmations Channel
    pageSet.addPage(new DynamicPage(
        {confirmationsChannel: template.confirmationsChannel},
        (fields: Partial<IRaidConfig>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Raid Confirmations Channel')
                .setDescription('Respond with the channel you would like secondary react confirmations to be sent in. ' +
                'This channel will be used to send a message for each raid containing all users who reacted and confirmed their secondary reactions for things like keys.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`#confirmationsChannel\`');
            clientTools.addFieldToEmbed(embed, 'To Turn Off This Feature', '\`--OFF\`');
            clientTools.addFieldToEmbed(embed, 'Confirmations Channel', fields.confirmationsChannel, {default: 'Off'});
            return embed;
        },
        (fields: Partial<IRaidConfig>, res: string): string => {
            if (res === '--OFF') {
                fields.confirmationsChannel = undefined;
                return 'Successfully turned off confirmations.';
            }
            const channel = RolesAndChannels.getChannel(guild, res, 'text');
            if (!channel) {
                return `Error: Channel, ${res}, not found!`;
            } else {
                fields.confirmationsChannel = channel.toString();
                return 'Successfully updated confirmation channel!';
            }
        }
    ));

    // Allow Early Booster Location
    pageSet.addPage(new DynamicPage(
        {allowBooster: template.allowBooster},
        (fields: Partial<IRaidConfig>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Allow Early Booster Location')
                .setDescription('Respond with \`yes\` if you\'d like to allow Nitro boosters of this server to receive early location. ' +
                'Respond with \`no\` if you would not like boosters to receive early location. ');
            clientTools.addFieldToEmbed(embed, 'Example', '\`yes\` or \`no\`');
            clientTools.addFieldToEmbed(embed, 'Allow Early Location', fields.allowBooster ? 'Yes' : 'No');
            return embed;
        },
        (fields: Partial<IRaidConfig>, res: string): string => {
            if (res.match(/yes/i)) {
                fields.allowBooster = true;
            } else {
                fields.allowBooster = false;
            }
            return 'Successfully updated!';
        }
    ));
}