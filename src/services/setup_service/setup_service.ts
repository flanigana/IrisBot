import { injectable, inject, unmanaged } from 'inversify';
import { TYPES } from '../../types';
import { Message, MessageEmbed, User, MessageReaction, ReactionCollector, Guild } from 'discord.js';
import { Template } from '../../models/templates/template';
import { Bot } from '../../bot';
import { PageSet } from './pages/page_set';
import { ClientTools } from '../../utilities/client_tools';
import logger from '../../../winston';

@injectable()
export abstract class SetupService<E extends Template> {

    private static readonly PAGE_REACTIONS = new Set(['⬅', '➡', '❌']);

    private readonly _Bot: Bot;
    protected readonly _ClientTools: ClientTools;
    private readonly _Message: Message;

    protected _pageSet: PageSet<E>;
    private _view: Message;

    protected _template: Partial<E>;

    public constructor(
        @inject(TYPES.Bot) bot: Bot,
        @inject(TYPES.ClientTools) clientTools: ClientTools,
        @unmanaged() message: Message,
        @unmanaged() template: Partial<E>
    ) {
        this._Bot = bot;
        this._ClientTools = clientTools;
        this._Message = message;
        this._template = template;
    }

    protected abstract save(): Promise<boolean>;
    protected abstract getEndPage(finished?: boolean): MessageEmbed;
    protected abstract createPageSet(): PageSet<E>;
    protected abstract get isFinished(): boolean;

    protected get authorId(): string {
        return this._Message.author.id;
    }

    protected get guild(): Guild {
        return this._Message.guild;
    }

    protected get channel() {
        return this._Message.channel;
    }

    protected getStartPage(): MessageEmbed {
        return this._ClientTools.getStandardEmbed()
            .setTitle('Setup Service')
            .setDescription('To use this service, send a response in this channel whenever prompted. ' +
            '\nYou can navigate the pages by reacting with ⬅ and ➡. To change pages again, just unreact and react again. ' +
            '\nTo cancel this setup at any time, react with ❌. Doing this will discard all changes made. ');
    }

    private getCancelledPage(): MessageEmbed {
        return this._ClientTools.getStandardEmbed()
            .setTitle('Service Cancelled')
            .setDescription('No changes were saved.');
    }

    private async processCollection(collector: ReactionCollector, reaction: MessageReaction): Promise<Message> {
        switch (reaction.emoji.name) {
            case '❌': // cancel
                logger.debug('Guild:%s|%s - User:%s|%s cancelled the SetupService.', this._Message.guild.id, this._Message.guild.name, this.authorId, this._Message.author.username);
                collector.stop();
                this._Bot.userUnignore(this.authorId, this.channel.id);
                return this._view.edit(this.getCancelledPage());
            case '⬅': // previous page
                if (this._pageSet.hasPrevious) {
                    return this._pageSet.getPreviousPageView().then((embed: MessageEmbed) => {
                        return this._view.edit(embed);
                    });
                }
            case '➡': // next page
                if (this._pageSet.hasNext) {
                    return this._pageSet.getNextPageView().then((embed: MessageEmbed) => {
                        return this._view.edit(embed);
                    });
                } else {
                    if (this.isFinished) {
                        collector.stop();
                        this._Bot.userUnignore(this.authorId, this.channel.id);
                        this.save();
                        logger.info('Guild:%s|%s - User:%s|%s saved a template:%s', this._Message.guild.id, this._Message.guild.name, this.authorId, this._Message.author.username, this._template);
                        return this._view.edit(this.getEndPage(true));
                    } else {
                        let embed: MessageEmbed = this.getEndPage(false);
                        return this._view.edit(embed);
                    }
                }
        }
    }

    private addReactionCollector(message: Message, responseListener: (res: Message) => void): void {
        const reactionFilter = (reaction: MessageReaction, user: User) => ((user.id === this.authorId) && SetupService.PAGE_REACTIONS.has(reaction.emoji.name));

        const collector = message.createReactionCollector(reactionFilter, {time: 10*(60*1000)});

        collector.on('collect', (reaction: MessageReaction) => {
            this.processCollection(collector, reaction);
        });

        collector.on('end', async () => {
            this._Bot.removeListener<'message'>('message', responseListener);
            return message.reactions.removeAll();
        });
    }

    private async processResponse(res: string): Promise<void> {
        this._pageSet.validate(res).then((template) => {
            Object.assign<Partial<E>, Partial<E>>(this._template, template);
            this._pageSet.getCurrentPageView().then((embed: MessageEmbed) => {
                return this._view.edit(embed);
            });
        });
    }

    private attachMessageListener(): (res: Message) => void {
        const responseListener = (res: Message) => {
            if (this.isRelevant(res.author.id, res.channel.id)) {
                if (res.deletable) {
                    res.delete();
                }
                this.processResponse(res.content);
            }
        };

        this._Bot.addListener<'message'>('message', responseListener);
        this._Bot.userIgnore(this.authorId, this.channel.id);

        return responseListener;
    }

    private isRelevant(authorId: string, channelId: string): boolean {
        if (authorId !== this.authorId) {
            return false;
        }
        if (channelId !== this.channel.id) {
            return false;
        }
        return true;
    }

    public startService() {
        this.channel.send(this.getStartPage()).then((msg: Message) => {
            this._view = msg;
            const responseListener = this.attachMessageListener();
            this.addReactionCollector(msg, responseListener);
            SetupService.PAGE_REACTIONS.forEach((reaction) => {
                msg.react(reaction);
            });
        });
    }
}