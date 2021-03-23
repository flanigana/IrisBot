import { inject, injectable, interfaces, unmanaged } from 'inversify';
import container from '../../inversify.config';
import { TYPES } from '../types';
import { SetupService, SetupType } from '../setup_service/generics/setup_service';
import { Message, MessageEmbed } from 'discord.js';
import { ClientTools } from '../utilities/client_tools';
import { Bot } from '../bot';
import logger from '../utilities/logging';
import { TemplateService } from '../services/generics/template_service';
import { GuildTemplate } from '../models/interfaces/data_model';

@injectable()
export class TemplateController<T extends GuildTemplate> {

    protected readonly _ClientTools: ClientTools;
    protected readonly _TemplateService: TemplateService<T>;
    protected readonly _SetupType: SetupType;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @unmanaged() templateService: TemplateService<T>,
        @unmanaged() setupType: SetupType
    ) {
        this._ClientTools = clientTools;
        this._TemplateService = templateService;
        this._SetupType = setupType;
    }

    /**
     * Sends a message containing the names of templates in the guild
     * @param message message sent by the user
     */
    protected listTemplates(message: Message): void {
        this._TemplateService.findTemplatesByGuildId(message.guild.id).then((templates) => {
            const embed = this._ClientTools.getStandardEmbed()
                    .setTitle(`${message.guild.name} Templates`);
            if (templates.length === 0) {
                embed.setDescription('There are no templates in this server.');
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
    protected createDeletionConfirmation(templateName: string, deleted: boolean): MessageEmbed {
        const embed = this._ClientTools.getStandardEmbed();
        if (deleted) {
            embed.setTitle(`**${templateName}** Successfully Deleted`);
        } else {
            embed.setTitle(`**${templateName}** Was Not Deleted`);
        }
        return embed;
    }

    protected confirmTemplateDeletion(message: Message, templateName: string): Promise<void> {
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
                        logger.info('Guild:%s|%s - Template "%s" was deleted by User:%s|%s.', message.guild.id, message.guild.name, templateName, message.author.id, message.author.username);
                        return this._TemplateService.deleteTemplate(message.guild.id, templateName, false).then(() => {
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

    protected async deleteTemplate(message: Message, args: string[]): Promise<void> {
        const templateName = args.length >= 3 ? args.slice(2).join(' ') : undefined;
        return this.confirmTemplateDeletion(message, templateName);
    }

    protected async editTemplate(message: Message, args: string[]): Promise<SetupService<T>> {
        const templateName = args.length >= 3 ? args.slice(2).join(' ') : undefined;
        const template = await this._TemplateService.findTemplate(message.guild.id, templateName, false);
        logger.debug('Guild:%s|%s - User:%s|%s started TemplateManagerService in edit mode with Template:%s|%s.', message.guild.id, message.guild.name, message.author.id, message.author.username, template._id, template.name);
        return container.get<interfaces.Factory<SetupService<T>>>(TYPES.SetupService)(this._SetupType, message, template) as SetupService<T>;
    }

    protected async createTemplateManager(message: Message, args: string[]): Promise<void> {
        let templateManagerService: SetupService<T>;
        if (args[1].match(/create/i)) {
            logger.debug('Guild:%s|%s - User:%s|%s started TemplateManager in create mode.', message.guild.id, message.guild.name, message.author.id, message.author.username);
            templateManagerService = container.get<interfaces.Factory<SetupService<T>>>(TYPES.SetupService)(this._SetupType, message) as SetupService<T>;
        } else {
            templateManagerService = await this.editTemplate(message, args);
            if (!templateManagerService) {
                return;
            }
        }

        templateManagerService.startService();
    }

    public handleMessage(message: Message, args: string[]): void {
        if (args.length < 2) {
            return;
        }
        switch (args[1].toLowerCase()) {
            case 'create':
            case 'edit':
                this.createTemplateManager(message, args);
                break;
            case 'delete':
                this.deleteTemplate(message, args);
                break;
            case 'list':
                this.listTemplates(message);
                break;
        }
    }
}