import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Message } from 'discord.js';
import { RaidTemplateService } from '../services/raid_template_service';
import { ClientTools } from '../utilities/client_tools';
import { RaidTemplateController } from './template_controllers/raid_template_controller';
import { RaidManager } from '../raid_manager/raid_manager';

@injectable()
export class RaidController {

    private readonly _ClientTools: ClientTools;
    private readonly _RaidTemplateService: RaidTemplateService;
    private readonly _RaidTemplateController: RaidTemplateController;
    private readonly _RaidManager: RaidManager;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService,
        @inject(TYPES.RaidTemplateController) raidTemplateController: RaidTemplateController,
        @inject(TYPES.RaidManager) raidManager: RaidManager
    ) {
        this._ClientTools = clientTools;
        this._RaidTemplateService = raidTemplateService;
        this._RaidTemplateController = raidTemplateController;
        this._RaidManager = raidManager;
    }

    public async handleMessage(message: Message, args: string[]): Promise<void> {
        if (args.length < 2) {
            return;
        }

        const subCommand = args[1].toLowerCase();

        switch (subCommand) {
            case 'list':    // raid list
            case 'create':  // raid create
            case 'edit':    // raid edit :templateName
            case 'delete':  // raid delete :templateName
                this._RaidTemplateController.handleMessage(message, args);
                break;
            case 'start':   // raid start :templateName :alertTextChannel :destVoiceChannel ?:location
                this._RaidManager.startRaid(message, args);
                break;
        }
    }

}