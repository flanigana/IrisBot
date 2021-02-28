import { inject, injectable, interfaces } from 'inversify';
import container from '../../inversify.config';
import { TYPES } from '../types';
import { SetupService } from '../services/setup_service/setup_service';
import { SetupType } from '../services/setup_service/setup_type';
import { Message, MessageEmbed } from 'discord.js';
import { IRaidTemplate } from '../models/templates/raid_template';
import { RaidTemplateManager } from '../services/setup_service/raid_template_manger';
import { RaidTemplateService } from '../services/raid_template_service';
import { ClientTools } from '../utilities/client_tools';
import { Bot } from '../bot';

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

    private sendTemplateDoesNotExist(message: Message, templateName: string) {
        let embed = this._ClientTools.getStandardEmbed();
        embed.setTitle('Raid Template Not Found')
            .setDescription(`A raid template with the name **${templateName}** could not be found.`);
        message.channel.send(embed);
    }

    private createDeletionConfirmation(templateName: string, deleted: boolean): MessageEmbed {
        let embed = this._ClientTools.getStandardEmbed();
        if (deleted) {
            embed.setTitle(`**${templateName}** Successfully Deleted`);
        } else {
            embed.setTitle(`**${templateName}** Was Not Deleted`);
        }
        return embed;
    }

    private confirmTemplateDeletion(message: Message, templateName: string): Promise<void> {
        let bot = container.get<Bot>(TYPES.Bot);
        let embed = this._ClientTools.getStandardEmbed()
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
        const exists = await this._RaidTemplateService.existsByName(message.guild.id, templateName, false);
        if (!templateName || !exists) {
            this.sendTemplateDoesNotExist(message, templateName);
            return null;
        }
        return this.confirmTemplateDeletion(message, templateName);
    }

    private async editRaidTemplate(message: Message, args: string[]): Promise<RaidTemplateManager> {
        const templateName = args.length >= 3 ? args.slice(2).join(' ') : undefined;
        const exists = await this._RaidTemplateService.existsByName(message.guild.id, templateName, false);
        if (!templateName || !exists) {
            this.sendTemplateDoesNotExist(message, templateName);
            return null;
        }
        const template = await this._RaidTemplateService.findTemplate(message.guild.id, templateName, false);
        return container.get<interfaces.Factory<SetupService<IRaidTemplate>>>(TYPES.SetupService)(SetupType.RaidTemplate, message, template) as RaidTemplateManager;
    }

    private async createRaidTemplateManager(message: Message, args: string[]): Promise<void> {
        let raidTemplateManager;
        if (args[1].toLowerCase() === 'create') {
            raidTemplateManager = container.get<interfaces.Factory<SetupService<IRaidTemplate>>>(TYPES.SetupService)(SetupType.RaidTemplate, message) as RaidTemplateManager;
            
        } else {
            raidTemplateManager = await this.editRaidTemplate(message, args);
            if (!raidTemplateManager) {
                return;
            }
        }

        raidTemplateManager.startService();
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
        }
    }
}