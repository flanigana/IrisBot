import {Client, Message} from 'discord.js';
import {inject, injectable} from 'inversify';
import {TYPES} from './types';
// import {MessageResponder} from "./services/message-responder";

/**
 * Responsible for the core functionality including:
 * Logging into the Discord Client
 * Handling message events
 * Handling all other guild-based events
 */
@injectable()
export class Bot {
    private client: Client;
    private readonly token: string;
    private readonly prefixes = ['!', '-', '.', '+', '?', '$', '>', '/', ';', '*', 's!', '=', 'm!', '!!'];

    /**
     * 
     * @param client Discord Client to connect to the bot
     * @param token Client login token obtained through the Discord developer portal
     */
    constructor(
        @inject(TYPES.Client) client: Client,
        @inject(TYPES.Token) token: string
    ) {
        this.client = client;
        this.token = token;
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
        this.client.on('message', (message: Message) => {
            if (message.author.bot || !this.startsWithValidPrefix(message)) {
                return;
            }

            console.log('Message received! Contents: ', message.content);
        });

        if (login) {
            return this.client.login(this.token);
        } else { // used for testing only
            return Promise.resolve('test');
        }
    }

    /**
     * Logs out the Discord Client
     */
    public logout() {
        this.client.destroy();
    }
}