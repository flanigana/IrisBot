import { injectable, inject, interfaces } from 'inversify';
import { TYPES } from '../types';
import { Client, Message } from 'discord.js';
import { MessageParser } from '../utilities/message_parser';
import { IGuild } from '../models/guild';
import { GuildService } from '../services/guild_service';
import { RaidController } from '../raid/raid_controller';
import { ConfigController } from './config_controller';
import { VerificationController } from '../verification/verification_controller';

/**
 * Responsible for processing and redirecting messages to the service dealing with their respective command and origin
 */
@injectable()
export class MessageDispatcher {

    private readonly _Client: Client;
    private readonly _GuildService: GuildService;
    private readonly _ConfigController: ConfigController;
    private readonly _VerificationController: VerificationController;
    private readonly _RaidController: RaidController;

    public constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildService) guildService: GuildService,
        @inject(TYPES.ConfigController) configController: ConfigController,
        @inject(TYPES.VerificationController) verificationController: VerificationController,
        @inject(TYPES.RaidController) raidController: RaidController,
    ) {
        this._Client = client;
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
     * Handles messages received in a server by first checking that it starts with the valid Guild prefix and then dispatching the command to the applicable services
     * @param message the received Message
     */
    public async handleGuildMessage(message: Message) {
        await this._GuildService.validateGuildDoc(message.guild);
        const guild = await this._GuildService.findById(message.guild.id);
        if (!message.content.startsWith(guild.prefix)) {
            return;
        }
        let args = this.parseGuildCommand(guild, message.content);

        switch (args[0].toLowerCase()) {
            case 'config':
                this._ConfigController.handleMessage(message, args);
                break;
            case 'verification':
                this._VerificationController.handleMessage(message, args);
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