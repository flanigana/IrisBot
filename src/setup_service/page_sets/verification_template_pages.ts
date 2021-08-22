import { Guild, MessageEmbed } from "discord.js";
import container from "../../../inversify.config";
import { dungeonRequirementsToStringArray, IVerificationTemplate } from "../../models/verification_template";
import { RealmEyeError } from "../../realmeye/realmeye_error";
import { RealmEyeService } from "../../realmeye/realmeye_service";
import { DungeonCompletions } from "../../realmeye/realmeye_types";
import { VerificationTemplateService } from "../../services/verification_template_service";
import { TYPES } from "../../types";
import { ClientTools } from "../../utilities/client_tools";
import { MessageParser } from "../../utilities/message_parser";
import { RolesAndChannels } from "../../utilities/role_and_channel_finder";
import { StringUtils } from "../../utilities/string_utils";
import { DynamicConditionalPage, DynamicPage } from "../pages/page";
import { PageSet } from "../pages/page_set";

export default function addVerificationTemplatePages(pageSet: PageSet<IVerificationTemplate>, 
        template: Partial<IVerificationTemplate>, guild: Guild): void {
    const verificationTemplateService = container.get<VerificationTemplateService>(TYPES.VerificationTemplateService);
    const clientTools = container.get<ClientTools>(TYPES.ClientTools);

    function getExistingTemplateNames(): Promise<string[]> {
        return verificationTemplateService.findTemplatesByGuildId(guild.id).then((templates: IVerificationTemplate[]) => {
            return templates.filter(t => !t._id.equals(template._id)).map(t => t.name);
        });
    }
    function getUsedVerificationChannels(): Promise<string[]> {
        return verificationTemplateService.findTemplatesByGuildId(guild.id).then((templates: IVerificationTemplate[]) => {
            return templates.filter(t => !t._id.equals(template._id)).map(t => t.verificationChannel);
        });
    }

    // Name
    pageSet.addPage(new DynamicPage(
        {name: template.name},
        async (fields: Partial<IVerificationTemplate>): Promise<MessageEmbed> => {
            const existingTemplates = await getExistingTemplateNames();
            const embed = clientTools.getStandardEmbed()
                .setTitle('Name')
                .setDescription('Respond with the name you would like to use for this verification template. It cannot be the same name as an existing template. ' +
                '\n**Note:** If you wish to include spaces in your template name, the entire name must be enclosed in quotes when using it (ie "Template Name")!');
            clientTools.addFieldToEmbed(embed, 'Example', '\`General\`');
            clientTools.addFieldToEmbed(embed, 'Template Name', fields.name, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Other Template Names', existingTemplates, {default: 'None', inline: true});
            return embed;
        },
        async (fields: Partial<IVerificationTemplate>, res: string): Promise<string> => {
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

    // Verification Channel
    pageSet.addPage(new DynamicPage(
        {
            verificationChannel: template.verificationChannel,
            logChannel: template.logChannel
        },
        async (fields: Partial<IVerificationTemplate>): Promise<MessageEmbed> => {
            const usedChannels = await getUsedVerificationChannels();
            const embed = clientTools.getStandardEmbed()
                .setTitle('Verification Channel')
                .setDescription('Respond with the text channel you would like to use for users to begin their verification using this template. ' +
                '\nIf you would like verification logs to go to a different channel, respond with both the verification channel name **AND** the log channel name. ' +
                '\nThe same channel cannot be used twice. Invalid (already used) channel names are listed below.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`#verify\` or \`#verify #verificationLogs\`');
            clientTools.addFieldToEmbed(embed, 'Verification Channel', fields.verificationChannel, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Log Channel', fields.logChannel, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Used Verification Channels', usedChannels, {default: 'None'});
            return embed;
        },
        async (fields: Partial<IVerificationTemplate>, res: string): Promise<string> => {
            const usedChannels = await getUsedVerificationChannels();
            const args = MessageParser.parseMessage(res);
            const verify = RolesAndChannels.getChannel(guild, args[0], 'GUILD_TEXT');
            if (!verify) {
                return `Error: ${args[0]} is not a valid text channel.`;
            }
            if (usedChannels.includes(verify.toString())) {
                return `Error: A verification template already uses ${verify}. Please choose another channel.`;
            }
            fields.verificationChannel = verify.toString();
            const log = args.length > 1 ?
                    RolesAndChannels.getChannel(guild, args[1], 'GUILD_TEXT') :
                    verify;
            if (!log) {
                fields.logChannel = fields.logChannel || fields.verificationChannel;
                return `Error: ${args[1]} is not a valid text channel.`;
            }
            fields.logChannel = log.toString();
            return 'Successfully updated template channels!';
        }
    ));

    // Guild Verification
    pageSet.addPage(new DynamicPage(
        {guildVerification: template.guildVerification},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Guild Verification?')
                .setDescription('If you are using this template to verify guild members, respond yes; otherwise, respond no.');
                clientTools.addFieldToEmbed(embed, 'Example', '\`yes\` or \`no\`');
                clientTools.addFieldToEmbed(embed, 'Guild Verification?', fields.guildVerification ? 'Yes' : 'No');
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            fields.guildVerification = res.match(/yes/i) ? true : false;
            return 'Successfully set verification type!';
        }
    ));

    // Guild Name
    pageSet.addPage(new DynamicConditionalPage(
        () => {return template.guildVerification},
        {guildName: template.guildName},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Guild Name')
                .setDescription('Enter the name of your guild. This is case and space sensitive as it is used to check RealmEye.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`Black Bullet\`');
            clientTools.addFieldToEmbed(embed, 'Guild Name', fields.guildName, {default: 'Unset'});
            return embed;
        },
        async (fields: Partial<IVerificationTemplate>, res: string): Promise<string> => {
            try {
                const guildData = await RealmEyeService.getRealmEyeGuildData(res);
                fields.guildName = guildData.name;
                return 'Successfully set guild name!';
            } catch (e) {
                if (e instanceof RealmEyeError) {
                    return `Error: ${e.message}`;
                }
            }
        }
    ));

    // Guild Roles
    pageSet.addPage(new DynamicConditionalPage(
        () => {return template.guildVerification},
        {guildRoles: template.guildRoles},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const {founderRole, leaderRole, officerRole, memberRole, initiateRole} = fields.guildRoles;
            const embed = clientTools.getStandardEmbed()
                .setTitle('Guild Roles')
                .setDescription('Respond with the roles you would like to assign to each rank of your guild. ' +
                '\nLeave this blank if you *only* want to assign a single role for all guild members. You\'ll be asked on the next page. ');
            clientTools.addFieldToEmbed(embed, 'Example', '\`@founder @leader @officer @member @initiate\`');
            clientTools.addFieldToEmbed(embed, 'To Turn Rank Roles Off', '\`--OFF\`');
            clientTools.addFieldToEmbed(embed, 'Founder Role', founderRole, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Leader Role', leaderRole, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Officer Role', officerRole, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Member Role', memberRole, {default: 'Unset', inline: true});
            clientTools.addFieldToEmbed(embed, 'Initiate Role', initiateRole, {default: 'Unset', inline: true});
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--OFF') {
                fields.guildRoles = {
                    setRoles: false,
                    founderRole: undefined,
                    leaderRole: undefined,
                    officerRole: undefined,
                    memberRole: undefined,
                    initiateRole: undefined
                }
                return 'Sucessfully turned off guild roles.';
            }
            if (args.length < 5) {
                return 'Error: Must respond with all 5 roles at once.';
            }
            const founder = RolesAndChannels.getRole(guild, args[0]);
            if (!founder) {return `Error: ${args[0]} is not a valid role.`;}
            const leader = RolesAndChannels.getRole(guild, args[1]);
            if (!leader) {return `Error: ${args[1]} is not a valid role.`;}
            const officer = RolesAndChannels.getRole(guild, args[2]);
            if (!officer) {return `Error: ${args[2]} is not a valid role.`;}
            const member = RolesAndChannels.getRole(guild, args[3]);
            if (!member) {return `Error: ${args[3]} is not a valid role.`;}
            const initiate = RolesAndChannels.getRole(guild, args[4]);
            if (!initiate) {return `Error: ${args[4]} is not a valid role.`;}
            fields.guildRoles = {
                setRoles: true,
                founderRole: founder.toString(),
                leaderRole: leader.toString(),
                officerRole: officer.toString(),
                memberRole: member.toString(),
                initiateRole: initiate.toString()
            };
            return 'Successfully set guild roles!';
        }
    ))

    // Verified Roles
    pageSet.addPage(new DynamicPage(
        {verifiedRoles: template.verifiedRoles},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Verified Roles')
                .setDescription('Respond with the roles you would like to give to verified users upon verification. This can be one role or many.');
            clientTools.addFieldToEmbed(embed, 'To Set a New List', '\`@role1 @role2\`');
            clientTools.addFieldToEmbed(embed, 'To Add Roles', '\`+role3 +role4\`');
            clientTools.addFieldToEmbed(embed, 'To Remove Roles', '\`-role1 -role2\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`');
            clientTools.addFieldToEmbed(embed, 'Verified Roles', fields.verifiedRoles, {default: 'None'});
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.verifiedRoles = [];
                return 'Successfully removed all verified roles!';
            }
            const verifiedRoles = RolesAndChannels.getUpdatedList(guild, fields.verifiedRoles, args, 'role');
            if (verifiedRoles.length > 0) {
                fields.verifiedRoles = verifiedRoles;
                return 'Successfully set verified roles!';
            } else {
                return 'Error: Failed to find at least one valid role!';
            }
        }
    ));

    // Remove Roles
    pageSet.addPage(new DynamicPage(
        {removeRoles: template.removeRoles},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Removed Roles')
                .setDescription('Respond with the roles you would like to remove when users are verified. This can be one role or many.');
            clientTools.addFieldToEmbed(embed, 'To Set a New List', '\`@role1 @role2\`');
            clientTools.addFieldToEmbed(embed, 'To Add Roles', '\`+role3 +role4\`');
            clientTools.addFieldToEmbed(embed, 'To Remove Roles', '\`-role1 -role2\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`');
            clientTools.addFieldToEmbed(embed, 'Removed Roles', fields.removeRoles, {default: 'None'});
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.removeRoles = [];
                return 'Successfully removed all removed roles!';
            }
            const removeRoles = RolesAndChannels.getUpdatedList(guild, fields.removeRoles, args, 'role');
            if (removeRoles.length > 0) {
                fields.removeRoles = removeRoles;
                return 'Successfully set removed roles!';
            } else {
                return 'Error: Failed to find at least one valid role!';
            }
        }
    ));

    // Requirements
    pageSet.addPage(new DynamicPage(
        {
            fame: template.fame,
            rank: template.rank
        },
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Verification Requirements')
                .setDescription('Respond with the minimum fame and rank allowed in order for users to verify using this template.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`5000 30\`');
            clientTools.addFieldToEmbed(embed, 'Fame', `${fields.fame}`, {inline: true});
            clientTools.addFieldToEmbed(embed, 'Rank', `${fields.rank}`, {inline: true});
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length < 2) {
                return `Error: Required 2 valid number arguments but got ${args.length}.`;
            }
            const fame = MessageParser.parseNumber(args[0])
            fields.fame = fame > 0 ? fame : 0;
            const rank = MessageParser.parseNumber(args[1])
            fields.rank = rank > 0 ? rank : 0;
            return 'Successfully set template requirements!';
        }
    ));

    // Require Hidden Location
    pageSet.addPage(new DynamicPage(
        {requireHidden: template.requireHidden},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Require Hidden Location')
                .setDescription('If you would like users to have their location hidden on RealmEye, respond yes; otherwise, repond no.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`yes\` or \`no\`');
            clientTools.addFieldToEmbed(embed, 'Require Hidden Location?', fields.requireHidden ? 'Yes' : 'No');
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            fields.requireHidden = res.match(/yes/i) ? true : false;
            return 'Successfully set hidden requirement!';
        }
    ));

    // Dungeon Requirements
    pageSet.addPage(new DynamicPage(
        {dungeonRequirements: template.dungeonRequirements},
        (fields: Partial<IVerificationTemplate>): MessageEmbed => {
            const embed = clientTools.getStandardEmbed()
                .setTitle('Dungeon Completion Requirements')
                .setDescription('If you would like users to have completed a minimum number of some dungeons, set them here. ' +
                'You must list the dungeon name followed by a number as shown in the example below. You can list more than one pair.' +
                '\n**Note:** If the dungeon does not appear on [this page](https://www.realmeye.com/graveyard-summary-of-player/IAlec) then it is not tracked. ' + 
                'If you attempt to use a dungeon not on the listed page then **no user will be able to verify**.');
            clientTools.addFieldToEmbed(embed, 'Example', '\`void 25\` or \`cultist hideout 50 void 25 pirate cave 500\`');
            clientTools.addFieldToEmbed(embed, 'To Remove All', '\`--ALL\`');
            clientTools.addFieldToEmbed(embed, 'Dungeon Requirements', dungeonRequirementsToStringArray(fields.dungeonRequirements), {default: 'None', separator: '\n'});
            return embed;
        },
        (fields: Partial<IVerificationTemplate>, res: string): string => {
            const args = MessageParser.parseMessage(res);
            if (args.length === 1 && args[0] === '--ALL') {
                fields.dungeonRequirements = {};
                return 'Successfully removed all dungeon requirements.'
            }
            let dungeons:DungeonCompletions = {};
            let dungeon = '';
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num)) { // is num
                    if (!dungeon) {
                        return 'Error: Unexpected input formatting. Please look at the example and try again.';
                    }
                    const fullName = StringUtils.findBestMatch(dungeon, Array.from(RealmEyeService.dungeonList));
                    if (!fullName) {
                        return `Error: ${dungeon} is not a valid dungeon name.`;
                    }
                    dungeons[fullName] = num;
                    dungeon = '';
                } else {
                    dungeon += dungeon ? ` ${arg}` : `${arg}`;
                }
            }
            fields.dungeonRequirements = dungeons;
        }
    ));
}