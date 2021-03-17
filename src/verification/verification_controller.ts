import { Message } from "discord.js";
import { inject, injectable } from "inversify";
import { VerificationTemplateService } from "../services/verification_template_service";
import { TYPES } from "../types";
import { ClientTools } from "../utilities/client_tools";
import { VerificationTemplateController } from "./verification_template_controller";

@injectable()
export class VerificationController {

    private readonly _ClientTools: ClientTools;
    private readonly _VerificationTemplateService: VerificationTemplateService;
    private readonly _VerificationTemplateController: VerificationTemplateController;

    public constructor(
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @inject(TYPES.VerificationTemplateService) verificationTemplateService: VerificationTemplateService,
        @inject(TYPES.VerificationTemplateController) verificationTemplateController: VerificationTemplateController,
    ) {
        this._ClientTools = clientTools;
        this._VerificationTemplateService = verificationTemplateService;
        this._VerificationTemplateController = verificationTemplateController;
    }

    private sendTemplateDoesNotExist(message: Message, templateName: string): void {
        let embed = this._ClientTools.getStandardEmbed();
        embed.setTitle('Verification Template Not Found')
            .setDescription(`A verification template with the name **${templateName}** could not be found.`);
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

        if (!(await this._VerificationTemplateService.existsByName(message.guild.id, templateName, false))) {
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
            if (!(await this.checkTemplateExists(message, args))) {
                return;
            }
        }

        switch (subCommand) {
            case 'list': // verification list
            case 'create': // verification create
            case 'edit': // verification edit :templateName
            case 'delete': // verification delete :templateName
                this._VerificationTemplateController.handleMessage(message, args);
                break;
        }
    }

}