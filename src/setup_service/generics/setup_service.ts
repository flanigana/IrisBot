import { injectable, inject, unmanaged } from 'inversify';
import { TYPES } from '../../types';
import { Message, MessageEmbed, User, MessageReaction, ReactionCollector, Guild, TextBasedChannels } from 'discord.js';
import { DataModel } from '../../models/interfaces/data_model';
import { Bot } from '../../bot';
import { PageSet } from '../pages/page_set';
import { ClientTools } from '../../utils/client_tools';
import {
	CommandParameters,
	RootCommandCenter,
} from '../../command/root_command_centers/interfaces/root_command_center';
import { GuildMessageCommand } from '../../command/message_command';

export enum SetupType {
	GuildConfig,
	RaidConfig,
	RaidTemplate,
	VerificationTemplate,
}

@injectable()
export abstract class SetupService<E extends DataModel> {
	private readonly _PageReactions = new Set(['⬅', '➡', '❌']);
	protected readonly _EndPageDescription =
		'Almost finished, just look over the information below and react with ➡ one last time to complete the service.';
	protected readonly _EndPageDefaultFinalDescription =
		'The service is complete and your changes have been successfully saved.';

	private readonly _Bot: Bot;
	protected readonly _ClientTools: ClientTools;
	private readonly _Command: GuildMessageCommand<RootCommandCenter, CommandParameters>;

	protected _pageSet: PageSet<E>;
	private _view: Message;

	protected _template: Partial<E>;
	private _updatable: boolean;

	public constructor(
		@inject(TYPES.Bot) bot: Bot,
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@unmanaged() command: GuildMessageCommand<RootCommandCenter, CommandParameters>,
		@unmanaged() template: Partial<E>,
		@unmanaged() updatable?: boolean
	) {
		this._Bot = bot;
		this._ClientTools = clientTools;
		this._Command = command;
		this._template = template;
		this._updatable = updatable ? updatable : false;
		if (this._updatable) {
			this._PageReactions.add('✅');
		}
	}

	protected abstract save(): Promise<E>;
	protected abstract getEndPage(finished?: boolean): MessageEmbed;
	protected abstract createPageSet(): PageSet<E>;
	protected abstract get isFinished(): boolean;

	protected get authorId(): string {
		return this._Command.user.id;
	}

	protected get guild(): Guild {
		return this._Command.guild;
	}

	protected get channel(): TextBasedChannels {
		return this._Command.channel;
	}

	protected getStartPage(): MessageEmbed {
		return this._ClientTools
			.getStandardEmbed()
			.setTitle('Setup Service')
			.setDescription(
				'To use this service, send a response in this channel whenever prompted. ' +
					'\nYou can navigate the pages by reacting with ⬅ and ➡. To change pages again, just unreact and react again. ' +
					'\nTo cancel this setup at any time, react with ❌. Doing this will discard all changes made. ' +
					`${this._updatable ? '\nTo end this service early and save your changes, react with ✅.' : ''}`
			);
	}

	private getCancelledPage(): MessageEmbed {
		return this._ClientTools
			.getStandardEmbed()
			.setTitle('Service Cancelled')
			.setDescription('No changes were saved.');
	}

	private onCompletion(collector: ReactionCollector): Promise<Message> {
		collector.stop();
		this._Bot.userUnignore(this.authorId, this.channel.id);
		this.save();
		return this._view.edit({ embeds: [this.getEndPage(true)] });
	}

	private async processCollection(collector: ReactionCollector, reaction: MessageReaction): Promise<Message> {
		switch (reaction.emoji.name) {
			case '✅': // end early
				return this.onCompletion(collector);
			case '❌': // cancel
				collector.stop();
				this._Bot.userUnignore(this.authorId, this.channel.id);
				return this._view.edit({ embeds: [this.getCancelledPage()] });
			case '⬅': // previous page
				if (this._pageSet.hasPrevious) {
					return this._pageSet.getPreviousPageView().then((embed: MessageEmbed) => {
						return this._view.edit({ embeds: [embed] });
					});
				}
				break;
			case '➡': // next page
				if (this._pageSet.hasNext) {
					return this._pageSet.getNextPageView().then((embed: MessageEmbed) => {
						return this._view.edit({ embeds: [embed] });
					});
				} else {
					if (this.isFinished) {
						return this.onCompletion(collector);
					} else {
						const embed: MessageEmbed = this.getEndPage(false);
						return this._view.edit({ embeds: [embed] });
					}
				}
		}
	}

	private addReactionCollector(message: Message, responseListener: (res: Message) => void): void {
		const reactionFilter = (reaction: MessageReaction, user: User) =>
			user.id === this.authorId && this._PageReactions.has(reaction.emoji.name);

		const collector = message.createReactionCollector({
			filter: reactionFilter,
			time: 10 * (60 * 1000),
		});

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
				return this._view.edit({ embeds: [embed] });
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

	public startService(): void {
		this.channel.send({ embeds: [this.getStartPage()] }).then((msg: Message) => {
			this._view = msg;
			const responseListener = this.attachMessageListener();
			this.addReactionCollector(msg, responseListener);
			for (const reaction of this._PageReactions) {
				msg.react(reaction);
			}
		});
	}
}
