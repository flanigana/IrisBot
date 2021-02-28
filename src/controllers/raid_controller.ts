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

    public handleMessage(message: Message, args: string[]): void {
        if (args.length < 2) {
            return;
        }
        switch (args[1].toLowerCase()) {
            case 'create':
            case 'edit':
            case 'delete':
                this._RaidTemplateController.handleMessage(message, args);
                break;
        }
    }

}