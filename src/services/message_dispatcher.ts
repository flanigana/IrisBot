import { injectable, inject } from 'inversify';
import { TYPES } from '../types';
import { Client, Message } from 'discord.js';
import { IGuild } from '../models/guild';
import { GuildService } from './guild_service';

/**
 * Responsible for processing and redirecting messages to the service dealing with their respective command and origin
 */
@injectable()
export class MessageDispatcher {

    private readonly _Client: Client;
    private readonly _GuildService: GuildService;

    public constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.GuildService) guildService: GuildService
    ) {
        this._Client = client;
        this._GuildService = guildService;
    }

    // Regex for role and channel matching /(<(#|@&)\d*>)/g
    /**
     * Returns an array of strings grouping arguments enclosed with quotes together as one argument
     * @param msg message string to parse
     */
    public parseCommand(msg: string): string[] {
        return msg.match(/("[^"]+")|('[^']+')|(\S+)/g).map(arg => {return arg.replace(/['"]/g, '')});
    }

    /**
     * Returns an array of strings while removing the prefix and grouping arguments enclosed with quotes together as one argument
     * @param guild the Guild doc for the guild the message was sent from
     * @param msg message string to parse
     */
    public parseGuildCommand(guild: IGuild, msg: string): string[] {
        msg = msg.substring(guild.prefix.length).trim();
        return this.parseCommand(msg);
    }

    /**
     * Handles messages received in a server by first checking that it starts with the valid Guild prefix and then dispatching the command to the applicable services
     * @param message the received Message
     */
    public async handleGuildMessage(message: Message) {
        const guild = await this._GuildService.findById(message.guild.id);
        if (!message.content.startsWith(guild.prefix)) {
            return;
        }
        let args = this.parseGuildCommand(guild, message.content);

        switch (args[0].toLowerCase()) {
            case 'raid':
                break;
        }
    }

    /**
     * Handles the received message based on message channel type
     * @param message the received Message
     */
    public handleMessage(message: Message) {
        switch (message.channel.type) {
            case 'text':
                this.handleGuildMessage(message);
                break;
            case 'dm':
                break;
        }
    }
}