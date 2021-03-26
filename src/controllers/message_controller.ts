import { injectable, inject, interfaces } from 'inversify';
import { TYPES } from '../types';
import { Client, Message } from 'discord.js';
import { MessageParser } from '../utilities/message_parser';
import { IGuild } from '../models/guild';
import { GuildService } from '../services/guild_service';
import { RaidController } from './raid_controller';
import { ConfigController } from './config_controller';
import { VerificationController } from '../verification/verification_controller';
import { VerificationTemplateController } from './template_controllers/verification_template_controller';

/**
 * Responsible for redirecting messages to the controller dealing with their respective command and origin
 */
@injectable()
export class MessageController {

    private readonly _GuildService: GuildService;
    private readonly _ConfigController: ConfigController;
    private readonly _VerificationTemplateController: VerificationTemplateController;
    private readonly _RaidController: RaidController;

    public constructor(
        @inject(TYPES.GuildService) guildService: GuildService,
        @inject(TYPES.ConfigController) configController: ConfigController,
        @inject(TYPES.VerificationController) verificationTemplateController: VerificationTemplateController,
        @inject(TYPES.RaidController) raidController: RaidController,
    ) {
        this._GuildService = guildService;
        this._ConfigController = configController;
        this._VerificationTemplateController = verificationTemplateController;
        this._RaidController = raidController;
    }

    /**
     * Returns an array of strings while removing the prefix and grouping arguments enclosed with quotes together as one argument
     * @param guild the Guild doc for the guild the message was sent from
     * @param msg message string to parse
     */
    public parseGuildCommand(guild: IGuild, msg: string): string[] {
        msg = msg.substring(guild.prefix.length).trim();
        return MessageParser.parseMessage(msg);
    }

    /**
     * Handles messages received in a server by first checking that it starts with the valid Guild prefix and then dispatching the
     * command to the applicable controller
     * @param message the received Message
     */
    public async handleGuildMessage(message: Message) {
        const guild = await this._GuildService.safeFindGuild(message.guild);
        if (!message.content.startsWith(guild.prefix)) {
            return;
        }
        let args = this.parseGuildCommand(guild, message.content);

        switch (args[0].toLowerCase()) {
            case 'config':
                this._ConfigController.handleMessage(message, args);
                break;
            case 'verification':
                this._VerificationTemplateController.handleMessage(message, args);
                break;
            case 'raid':
                this._RaidController.handleMessage(message, args);
                break;
        }
    }

    /**
     * Handles the received message based on message channel type
     * @param message the received Message
     */
    public handleMessage(message: Message): void {
        switch (message.channel.type) {
            case 'text':
                this.handleGuildMessage(message);
                break;
            case 'dm':
                break;
        }
    }
}