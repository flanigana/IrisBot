import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Message } from 'discord.js';
import { MessageParser } from '../utilities/message_parser';
import { IGuild } from '../models/guild';
import { GuildService } from '../services/guild_service';
import { RaidController } from './raid_controller';
import { ConfigController } from './config_controller';
import { VerificationController } from './verification_controller';
import Logger from '../utilities/logging';

/**
 * Responsible for redirecting messages to the controller dealing with their respective command and origin
 */
@injectable()
export class MessageController {

    private readonly _GuildService: GuildService;
    private readonly _ConfigController: ConfigController;
    private readonly _VerificationController: VerificationController;
    private readonly _RaidController: RaidController;

    public constructor(
        @inject(TYPES.GuildService) guildService: GuildService,
        @inject(TYPES.ConfigController) configController: ConfigController,
        @inject(TYPES.VerificationController) verificationController: VerificationController,
        @inject(TYPES.RaidController) raidController: RaidController,
    ) {
        this._GuildService = guildService;
        this._ConfigController = configController;
        this._VerificationController = verificationController;
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
        const args = this.parseGuildCommand(guild, message.content);
        const command = args[0].toLowerCase();

        switch (command) {
            case 'config':
                this._ConfigController.handleMessage(message, args);
                break;
            case 'verification':
            case 'verify':
                this._VerificationController.handleMessage(message, args);
                break;
            case 'raid':
                this._RaidController.handleMessage(message, args);
                break;
        }
    }

    /**
     * Handles direct messages received from users by dispatching the command to the applicable controller
     * @param message the recieved Message
     */
    public handleDirectMessage(message: Message): void {
        const args = MessageParser.parseMessage(message.content.substr(1));
        const command = args[0].toLowerCase();

        switch (command) {
            case 'verify':
            case 'updateign':
                this._VerificationController.handleMessage(message, args);
        }
    }

    /**
     * Handles the received message based on message channel type
     * @param message the received Message
     */
    public handleMessage(message: Message): void {
        switch (message.channel.type) {
            case 'text':
                Logger.debug('Guild message received', {guild: message.guild, user: message.author});
                this.handleGuildMessage(message);
                break;
            case 'dm':
                Logger.debug('Direct message received', {user: message.author});
                this.handleDirectMessage(message);
                break;
        }
    }
}