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

        const subCommand = args[1].toUpperCase();

        switch (subCommand) {
            case 'LIST':    // raid list
            case 'CREATE':  // raid create
            case 'EDIT':    // raid edit :templateName
            case 'DELETE':  // raid delete :templateName
                this._RaidTemplateController.handleMessage(message, args);
                break;
            case 'START':   // raid start :templateName :alertTextChannel :destVoiceChannel ?:location
                this._RaidManager.startRaid(message, args);
                break;
        }
    }

}