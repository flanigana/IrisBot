import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Message } from 'discord.js';
import { VerificationTemplateController } from './template_controllers/verification_template_controller';
import { VerificationManager } from '../verification/verification_manager';
import { VerificationMessenger } from '../verification/verification_messenger';
import { UserService } from '../services/user_service';

@injectable()
export class VerificationController {

    private readonly _VerificationTemplateController: VerificationTemplateController;
    private readonly _VerificationManager: VerificationManager;
    private readonly _VerificationMessenger: VerificationMessenger;
    private readonly _UserService: UserService;

    public constructor(
        @inject(TYPES.VerificationTemplateController) verificationTemplateController: VerificationTemplateController,
        @inject(TYPES.VerificationManager) verificationManager: VerificationManager,
        @inject(TYPES.VerificationMessenger) verificationMessenger: VerificationMessenger,
        @inject(TYPES.UserService) userService: UserService
    ) {
        this._VerificationTemplateController = verificationTemplateController;
        this._VerificationManager = verificationManager;
        this._VerificationMessenger = verificationMessenger;
        this._UserService = userService;
    }

    /**
     * Handles and dispatches verification messages received in a Guild
     * @param message Message sent in a Guild Channel
     * @param args Parsed arguments from the Message content
     */
    public handleGuildMessage(message: Message, args: string[]): void {
        const command = args[0].toUpperCase();

        switch (command) {
            case 'VERIFICATION':
                this._VerificationTemplateController.handleMessage(message, args);
                break;
            default:
                this._VerificationManager.handleMessage(message, args);
                break;
        }
    }

    /**
     * Handles and dispatches verification messages received in a Guild
     * @param message Message sent in a dm Channel
     * @param args Parsed arguments from the Message content
     */
    public async handleDirectMessage(message: Message, args: string[]): Promise<void> {
        const command = args[0].toUpperCase();

        switch (command) {
            case 'VERIFY':
                if (args.length > 1) {
                    this._VerificationManager.attemptIgnLinking(message.author, args[1]);
                } else {
                    this._VerificationMessenger.sendInvalidIgnLinkingCommandToUser(message.author);
                }
                break;
            case 'UPDATEIGN':
                this._VerificationManager.beginIgnLinking(message.author, true);
                break;
        }
    }

    /**
     * Handles and dispatches all verification messages received
     * @param message Message receieved
     * @param args Parsed arguments from the Message content
     */
    public handleMessage(message: Message, args: string[]): void {
        if (args.length < 1) {
            return;
        }

        switch (message.channel.type) {
            case 'text':
                this.handleGuildMessage(message, args);
                break;
            case 'dm':
                this.handleDirectMessage(message, args);
                break;
        }
    }

}