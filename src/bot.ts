import { inject, injectable } from 'inversify';
import { TYPES } from './types';
import * as mongoose from 'mongoose';
import { Client, ClientEvents, Guild, Message } from 'discord.js';
import { GuildService } from './services/guild_service';
import { MessageDispatcher } from './general/message_dispatcher';
import { ClientTools } from './utilities/client_tools';

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
    private readonly _MessageDispatcher: MessageDispatcher;

    public static readonly PREFIXES = new Set<string>(['!', '-', '.', '+', '?', '$', '>', '/', ';', '*', 's!', '=', 'm!', '!!']);

    private _ignoreList: Map<string, Set<string>>; // used to isolate users using the template service

    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.DiscordToken) token: string,
        @inject(TYPES.GuildService) guildService: GuildService,
        @inject(TYPES.MessageDispatcher) MessageDispatcher: MessageDispatcher
    ) {
        this._Client = client;
        this._Token = token;
        this._GuildService = guildService;
        this._MessageDispatcher = MessageDispatcher;

        this._ignoreList = new Map();
    }

    /**
     * Ignores a user within a channel.
     * Used in SetupService to focus responses for the service and prevent confusion
     * @param userId id of user to ignore
     * @param channelId id of channel to ignore user in
     */
    public userIgnore(userId: string, channelId: string): void {
        if (!this._ignoreList.has(userId)) {
            this._ignoreList.set(userId, new Set([channelId]));
        } else {
            this._ignoreList.get(userId).add(channelId);
        }
    }

    /**
     * Unignores an ignored user
     * @param userId id of user to unignore
     * @param channelId id of channel to unignore user in
     */
    public userUnignore(userId: string, channelId: string): void {
        if (!this._ignoreList.has(userId) || !this._ignoreList.get(userId).has(channelId)) {
            return;
        }
        this._ignoreList.get(userId).delete(channelId);
    }

    /**
     * Removes a listener from the bot
     * @param event event to remove from
     * @param listener listener to remove
     */
    public removeListener<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): void {
        this._Client.removeListener(event, listener);
    }

    /**
     * Adds a new listener to the bot
     * @param event event to listen for
     * @param listener callback function when the event happens
     */
    public addListener<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): void {
        this._Client.on(event, listener);
    }

    /**
     * Returns true if message content begins with one of the common prefixes and false otherwise.
     * Common prefixes include: ['!', '-', '.', '+', '?', '$', '>', '/', ';', '*', 's!', '=', 'm!', '!!']
     * @param message content of the message received
     */
    public startsWithValidPrefix(message: string): boolean {
        for (const p of Bot.PREFIXES) {
            if (message.startsWith(p)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Starts the general run operations for the bot
     * @param login whether to log the client in. Defaults to true, can be set to false for testing
     */
    public listen(login = true): Promise<string> {
        // on message
        this._Client.on<'message'>('message', async (message: Message) => {
            if (message.author.bot) {
                return;
            }
            if (message.channel.type === 'text' && !this.startsWithValidPrefix(message.content)) {
                return;
            }
            if (this._ignoreList.has(message.author.id) && this._ignoreList.get(message.author.id).has(message.channel.id)) {
                return;
            }
            this._MessageDispatcher.handleMessage(message);
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