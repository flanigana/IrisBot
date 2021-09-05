import { MessageEmbed } from 'discord.js';
import { inject, injectable, unmanaged } from 'inversify';
import { Bot } from '../bot';
import { IRaidConfig } from '../models/raid_config';
import { GuildService } from '../services/guild_service';
import { TYPES } from '../types';
import { ClientTools } from '../utils/client_tools';
import { DynamicPage, Page } from './pages/page';
import { PageSet } from './pages/page_set';
import addRaidConfigPages from './page_sets/raid_config_pages';
import { InteractiveSetup } from './generics/interactive_setup';
import { GuildMessageCommand } from '../command/message_command';
import { CommandParameters, RootCommandCenter } from '../command/interfaces/root_command_center';

@injectable()
export class RaidConfigSetup extends InteractiveSetup<IRaidConfig> {
	private readonly _GuildService: GuildService;

	public constructor(
		@inject(TYPES.Bot) bot: Bot,
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.GuildService) guildService: GuildService,
		@unmanaged() command: GuildMessageCommand<RootCommandCenter, CommandParameters<RootCommandCenter>>,
		@unmanaged() template: IRaidConfig
	) {
		super(bot, clientTools, command, template, true);
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
		ClientTools.addFieldToEmbed(embed, 'Raid Leader Roles', raidLeaders, { default: 'None' });
		ClientTools.addFieldToEmbed(embed, 'AFK-Check Run Time', `${runTime}`, { inline: true });
		ClientTools.addFieldToEmbed(embed, 'Confirmations Channel', confirmationsChannel, {
			default: 'Unset',
			inline: true,
		});
		ClientTools.addFieldToEmbed(embed, 'Allow Early Booster Location?', allowBooster ? 'Yes' : 'No', {
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
