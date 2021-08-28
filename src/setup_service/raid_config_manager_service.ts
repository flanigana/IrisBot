import { Message, MessageEmbed } from 'discord.js';
import { inject, injectable, unmanaged } from 'inversify';
import { Bot } from '../bot';
import { IRaidConfig } from '../models/raid_config';
import { GuildService } from '../services/guild_service';
import { TYPES } from '../types';
import { ClientTools } from '../utils/client_tools';
import { DynamicPage, Page } from './pages/page';
import { PageSet } from './pages/page_set';
import addRaidConfigPages from './page_sets/raid_config_pages';
import { SetupService } from './generics/setup_service';

@injectable()
export class RaidConfigManagerService extends SetupService<IRaidConfig> {
	private readonly _GuildService: GuildService;

	public constructor(
		@inject(TYPES.Bot) bot: Bot,
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.GuildService) guildService: GuildService,
		@unmanaged() message: Message,
		@unmanaged() template: IRaidConfig
	) {
		super(bot, clientTools, message, template, true);
		this._GuildService = guildService;
		this._pageSet = this.createPageSet();
	}

	protected get isFinished(): boolean {
		return true;
	}

	protected save(): Promise<IRaidConfig> {
		return this._GuildService.saveRaidConfig(this._template as IRaidConfig);
	}
	protected getEndPage(finished?: boolean): MessageEmbed {
		const { raidLeaders, runTime, confirmationsChannel, allowBooster } = this._template;

		const description = !finished ? this._EndPageDescription : this._EndPageDefaultFinalDescription;

		const embed = this._ClientTools.getStandardEmbed();
		if (description) {
			embed.setDescription(description);
		}
		this._ClientTools.addFieldToEmbed(embed, 'Raid Leader Roles', raidLeaders, { default: 'None' });
		this._ClientTools.addFieldToEmbed(embed, 'AFK-Check Run Time', `${runTime}`, { inline: true });
		this._ClientTools.addFieldToEmbed(embed, 'Confirmations Channel', confirmationsChannel, {
			default: 'Unset',
			inline: true,
		});
		this._ClientTools.addFieldToEmbed(embed, 'Allow Early Booster Location?', allowBooster ? 'Yes' : 'No', {
			inline: true,
		});
		return embed;
	}
	protected createPageSet(): PageSet<IRaidConfig> {
		const pageSet = new PageSet<IRaidConfig>(this._template);
		// add start page
		pageSet.addPage(new Page(this.getStartPage()));

		// add body pages
		addRaidConfigPages(pageSet, this._template, this.guild);

		// add end page
		pageSet.addPage(
			new DynamicPage(
				{},
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(fields: Partial<IRaidConfig>): MessageEmbed => {
					return this.getEndPage();
				}
			)
		);
		return pageSet;
	}
}
