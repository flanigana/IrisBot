import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Message } from 'discord.js';
import { RaidTemplateController } from './template_controllers/raid_template_controller';
import { RaidManager } from '../raid_manager/raid_manager';

@injectable()
export class RaidController {

    private readonly _RaidTemplateController: RaidTemplateController;
    private readonly _RaidManager: RaidManager;

    public constructor(
        @inject(TYPES.RaidTemplateController) raidTemplateController: RaidTemplateController,
        @inject(TYPES.RaidManager) raidManager: RaidManager
    ) {
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