import { inject, injectable, interfaces } from 'inversify';
import container from '../../inversify.config';
import { TYPES } from '../types';
import { SetupService } from '../setup_service/setup_service';
import { SetupType } from '../setup_service/setup_type';
import { Message, MessageEmbed } from 'discord.js';
import { IRaidTemplate } from '../models/templates/raid_template';
import { RaidTemplateManagerService } from '../setup_service/raid_template_manger_service';
import { RaidTemplateService } from '../services/raid_template_service';
import { ClientTools } from '../utilities/client_tools';
import { Bot } from '../bot';
import logger from '../utilities/logging';

@injectable()
export class RaidTemplateController {

    private readonly _ClientTools: ClientTools;
    private readonly _RaidTemplateService: RaidTemplateService;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService
    ) {
        this._ClientTools = clientTools;
        this._RaidTemplateService = raidTemplateService;
    }

    /**
     * Sends a message containing the names of raid templates in the guild
     * @param message message sent by the user
     */
    private listRaidTemplates(message: Message): void {
        this._RaidTemplateService.findTemplatesByGuildId(message.guild.id).then((templates) => {
            const embed = this._ClientTools.getStandardEmbed()
                    .setTitle(`${message.guild.name} Raid Templates`);
            if (templates.length === 0) {
                embed.setDescription("There are no raid templates in this server.");
            } else {
                this._ClientTools.addFieldToEmbed(embed, "Template Names", templates.map(t => t.name), {separator: '\n'});
            }
            message.channel.send(embed);
        });
    }

    /**
     * Creates a new MessageEmbed with the status of the template deletion
     * @param templateName name of the raid temmplate
     * @param deleted whether or not the template was deleted
     */
    private createDeletionConfirmation(templateName: string, deleted: boolean): MessageEmbed {
        const embed = this._ClientTools.getStandardEmbed();
        if (deleted) {
            embed.setTitle(`**${templateName}** Successfully Deleted`);
        } else {
            embed.setTitle(`**${templateName}** Was Not Deleted`);
        }
        return embed;
    }

    private confirmTemplateDeletion(message: Message, templateName: string): Promise<void> {
        let bot = container.get<Bot>(TYPES.Bot);
        const embed = this._ClientTools.getStandardEmbed()
            .setTitle('Template Deletion')
            .setDescription(`Are you sure you want to delete the **${templateName}** template? ` + 
                '\nReply with \`yes\` to confirm.');

        return message.channel.send(embed).then((msg) => {

            const messageListener = (res: Message) => {
                if ((res.channel.id === message.channel.id) && (res.author.id === message.author.id)) {
                    bot.removeListener<'message'>('message', messageListener);
                    if (res.deletable) {
                        res.delete();
                    }

                    const confirmRegEx = new RegExp(/^y.*/i);
                    if (confirmRegEx.test(res.content)) {
                        logger.info('Guild:%s|%s - Raid template "%s" was deleted by User:%s|%s.', message.guild.id, message.guild.name, templateName, message.author.id, message.author.username);
                        return this._RaidTemplateService.deleteTemplate(message.guild.id, templateName, false).then(() => {
                            return msg.edit(this.createDeletionConfirmation(templateName, true));
                        });
                    } else {
                        return msg.edit(this.createDeletionConfirmation(templateName, false));
                    }
                }
            }

            bot.addListener<'message'>('message', messageListener);
        })
    }

    private async deleteRaidTemplate(message: Message, args: string[]): Promise<void> {
        const templateName = args.length >= 3 ? args.slice(2).join(' ') : undefined;
        return this.confirmTemplateDeletion(message, templateName);
    }

    private async editRaidTemplate(message: Message, args: string[]): Promise<RaidTemplateManagerService> {
        const templateName = args.length >= 3 ? args.slice(2).join(' ') : undefined;
        const template = await this._RaidTemplateService.findTemplate(message.guild.id, templateName, false);
        logger.debug('Guild:%s|%s - User:%s|%s started RaidTemplateManagerService in edit mode with RaidTemplate:%s|%s.', message.guild.id, message.guild.name, message.author.id, message.author.username, template._id, template.name);
        return container.get<interfaces.Factory<SetupService<IRaidTemplate>>>(TYPES.SetupService)(SetupType.RaidTemplate, message, template) as RaidTemplateManagerService;
    }

    private async createRaidTemplateManager(message: Message, args: string[]): Promise<void> {
        let raidTemplateManagerService: RaidTemplateManagerService;
        if (args[1].match(/create/i)) {
            logger.debug('Guild:%s|%s - User:%s|%s started RaidTemplateManager in create mode.', message.guild.id, message.guild.name, message.author.id, message.author.username);
            raidTemplateManagerService = container.get<interfaces.Factory<SetupService<IRaidTemplate>>>(TYPES.SetupService)(SetupType.RaidTemplate, message) as RaidTemplateManagerService;
        } else {
            raidTemplateManagerService = await this.editRaidTemplate(message, args);
            if (!raidTemplateManagerService) {
                return;
            }
        }

        raidTemplateManagerService.startService();
    }

    public handleMessage(message: Message, args: string[]): void {
        if (args.length < 2) {
            return;
        }
        switch (args[1].toLowerCase()) {
            case 'create':
            case 'edit':
                this.createRaidTemplateManager(message, args);
                break;
            case 'delete':
                this.deleteRaidTemplate(message, args);
                break;
            case 'list':
                this.listRaidTemplates(message);
                break;
        }
    }
}