import { injectable, inject, unmanaged } from 'inversify';
import { TYPES } from '../types';
import { InteractiveSetup } from './generics/interactive_setup';
import { Bot } from '../bot';
import { IRaidTemplate, getBlankRaidTemplate } from '../models/raid_template';
import { MessageEmbed } from 'discord.js';
import { RaidTemplateService } from '../services/raid_template_service';
import { Page, DynamicPage } from './pages/page';
import { ClientTools } from '../utils/client_tools';
import { PageSet } from './pages/page_set';
import addRaidTemplatePages from './page_sets/raid_template_pages';
import { GuildMessageCommand } from '../command/message_command';
import { CommandParameters, RootCommandCenter } from '../command/interfaces/root_command_center';

@injectable()
export class RaidTemplateSetup extends InteractiveSetup<IRaidTemplate> {
	private readonly _RaidTemplateService: RaidTemplateService;

	public constructor(
		@inject(TYPES.Bot) bot: Bot,
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.RaidTemplateService) raidTemplateService: RaidTemplateService,
		@unmanaged() command: GuildMessageCommand<RootCommandCenter, CommandParameters<RootCommandCenter>>,
		@unmanaged() template = getBlankRaidTemplate({ guildId: command.guild.id }),
		@unmanaged() updatable = false
	) {
		super(bot, clientTools, command, template, updatable);
		this._RaidTemplateService = raidTemplateService;
		this._pageSet = this.createPageSet();
	}

	protected get isFinished(): boolean {
		const { name, description, primaryReact } = this._template;
		if (!name) {
			return false;
		}
		if (!description) {
			return false;
		}
		if (!primaryReact || !primaryReact.react) {
			return false;
		}
		return true;
	}

	public save(): Promise<IRaidTemplate> {
		return this._RaidTemplateService.save(this._template as IRaidTemplate);
	}

	public getStartPage(): MessageEmbed {
		return super.getStartPage().setTitle('Raid Template Service');
	}

	// TODO: Add command to use template after creation
	public getEndPage(finished?: boolean): MessageEmbed {
		const { name, description, primaryReact, secondaryReacts, additionalReacts } = this._template;

		const embedDescription = !finished
			? this._EndPageDescription
			: 'The template has been saved and is ready to use!';

		const embed: MessageEmbed = this._ClientTools.getStandardEmbed().setTitle('End');
		if (embedDescription) {
			embed.setDescription(embedDescription);
		}
		ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Name', value: name, options: { default: 'Unset' } },
			{ name: 'Description', value: description, options: { default: 'Unset' } },
			ClientTools.LINE_BREAK_FIELD,
			{ name: 'Primary React', value: primaryReact.react, options: { inline: true, default: 'Unset' } }
		);
		for (const sec of secondaryReacts) {
			ClientTools.addFieldToEmbed(embed, 'Secondary React', `${sec.react}: ${sec.limit}`, { inline: true });
		}
		ClientTools.addFieldToEmbed(
			embed,
			'Additional Reacts',
			additionalReacts.map((r) => r.react),
			{ default: 'None' }
		);

		if (!this.isFinished) {
			ClientTools.addFieldToEmbed(
				embed,
				'Error',
				'Name, description, or Primary React left undefined. These are required.'
			);
		}

		return embed;
	}

	public createPageSet(): PageSet<IRaidTemplate> {
		const pageSet = new PageSet<IRaidTemplate>(this._template);
		// add start page
		pageSet.addPage(new Page(this.getStartPage()));

		// add body pages
		addRaidTemplatePages(pageSet, this._template, this.guild.id);

		// add end page
		pageSet.addPage(
			new DynamicPage(
				{},
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(fields: Partial<IRaidTemplate>): MessageEmbed => {
					return this.getEndPage();
				}
			)
		);
		return pageSet;
	}
}
