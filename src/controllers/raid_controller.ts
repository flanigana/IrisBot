import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Message } from 'discord.js';
import { RaidTemplateService } from '../services/raid_template_service';
import { ClientTools } from '../utilities/client_tools';
import { RaidTemplateController } from './raid_template_controller';

@injectable()
export class RaidController {

    private readonly _ClientTools: ClientTools;
    private readonly _RaidTemplateService: RaidTemplateService;
    private readonly _RaidTemplateController: RaidTemplateController;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService,
        @inject(TYPES.RaidTemplateController) raidTemplateController: RaidTemplateController
    ) {
        this._ClientTools = clientTools;
        this._RaidTemplateService = raidTemplateService;
        this._RaidTemplateController = raidTemplateController;
    }

    private sendTemplateDoesNotExist(message: Message, templateName: string): void {
        let embed = this._ClientTools.getStandardEmbed();
        embed.setTitle('Raid Template Not Found')
            .setDescription(`A raid template with the name **${templateName}** could not be found.`);
        message.channel.send(embed);
    }

    private async checkTemplateExists(message: Message, args: string[]): Promise<boolean> {
        const subCommand = args[1].toLowerCase();

        let templateName = undefined;
        if (subCommand.match(/edit|delete/i)) {
            templateName = args.slice(2).join(' ');
        } else {
            templateName = args[2];
        }

        const exists = await this._RaidTemplateService.existsByName(message.guild.id, templateName, false);
        if (!exists) {
            this.sendTemplateDoesNotExist(message, templateName);
            return false;
        }
        return true;
    }

    public async handleMessage(message: Message, args: string[]): Promise<void> {
        if (args.length < 2) {
            return;
        }

        const subCommand = args[1].toLowerCase();
        if (!subCommand.match(/list|create/i)) {
            const exists = await this.checkTemplateExists(message, args);
            if (!exists) {
                return;
            }
        }

        switch (subCommand) {
            case 'list':
            case 'create':
            case 'edit':
            case 'delete':
                this._RaidTemplateController.handleMessage(message, args);
                break;
        }
    }

}