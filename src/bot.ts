import {inject, injectable} from 'inversify';
import { TYPES } from './types';
import * as mongoose from 'mongoose';
import {Client, Guild, Message} from 'discord.js';
import { GuildService } from './services/guild_service';
import container from '../inversify.config';

/**
 * Responsible for the core functionality including:
 * Logging into the Discord Client
 * Handling message events
 * Handling all other guild-based events
 */
@injectable()
export class Bot {
    private readonly _Client: Client;
    private readonly _Token: string;
    private readonly _GuildService: GuildService;

    private readonly prefixes = ['!', '-', '.', '+', '?', '$', '>', '/', ';', '*', 's!', '=', 'm!', '!!'];

    /**
     * 
     * @param client Discord Client to connect to the bot
     * @param token Client login token obtained through the Discord developer portal
     */
    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.DiscordToken) token: string,
        @inject(TYPES.GuildService) guildService: GuildService
    ) {
        this._Client = client;
        this._Token = token;
        this._GuildService = guildService;
    }

    /**
     * Returns true if message content begins with one of the common prefixes and false otherwise.
     * Common prefixes include: ['!', '-', '.', '+', '?', '$', '>', '/', ';', '*', 's!', '=', 'm!', '!!']
     * @param message received message
     */
    public startsWithValidPrefix(message: Message): boolean {
        return !this.prefixes.every((prefix: string) => {
            return !message.content.startsWith(prefix);
        })
    }

    /**
     * Starts the general run operations for the bot
     * @param login whether to log the client in. Defaults to true, can be set to false for testing
     */
    public listen(login = true): Promise<string> {
        // on message
        this._Client.on<'message'>('message', async (message: Message) => {
            if (message.author.bot || !this.startsWithValidPrefix(message)) {
                return;
            }
            // console.log(await this.guildService.findById('710578568211464192'));
            console.log('Message received! Contents: ', message.content);
        });

        // on guild creation
        this._Client.on<'guildCreate'>('guildCreate', async (guild: Guild) => {
            return this._GuildService.saveDiscordGuild(guild);
        });

        // on guild update
        this._Client.on<'guildUpdate'>('guildUpdate', async (guild: Guild) => {
            return this._GuildService.saveDiscordGuild(guild);
        });

        if (login) {
            return this._Client.login(this._Token);
        } else { // used for testing only
            return Promise.resolve('test');
        }
    }

    /**
     * Logs out the Discord Client and closes the connection to the database
     */
    public async logout() {
        this._Client.destroy();
        await mongoose.disconnect();
    }
}