import { MessageEmbed } from 'discord.js';
import { inject, injectable, unmanaged } from 'inversify';
import {
	dungeonRequirementsToStringArray,
	getBlankVerificationTemplate,
	IVerificationTemplate,
} from '../models/verification_template';
import { PageSet } from './pages/page_set';
import { InteractiveSetup } from './generics/interactive_setup';
import { Bot } from '../bot';
import { ClientTools } from '../utils/client_tools';
import { VerificationTemplateService } from '../services/verification_template_service';
import { TYPES } from '../types';
import { DynamicPage, Page } from './pages/page';
import addVerificationTemplatePages from './page_sets/verification_template_pages';
import { GuildMessageCommand } from '../command/message_command';
import { CommandParameters, RootCommandCenter } from '../command/interfaces/root_command_center';

@injectable()
export class VerificationTemplateSetup extends InteractiveSetup<IVerificationTemplate> {
	private readonly _VerificationTemplateService: VerificationTemplateService;

	public constructor(
		@inject(TYPES.Bot) bot: Bot,
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.VerificationTemplateService) verificationTemplateService: VerificationTemplateService,
		@unmanaged() command: GuildMessageCommand<RootCommandCenter, CommandParameters<RootCommandCenter>>,
		@unmanaged() template = getBlankVerificationTemplate({ guildId: command.guild.id }),
		@unmanaged() updatable = false
	) {
		super(bot, clientTools, command, template, updatable);
		this._VerificationTemplateService = verificationTemplateService;
		this._pageSet = this.createPageSet();
	}

	protected get isFinished(): boolean {
		const { name, verificationChannel, verifiedRoles, guildVerification, guildName } = this._template;
		if (!name) {
			return false;
		}
		if (!verificationChannel) {
			return false;
		}
		if (!verifiedRoles || !verifiedRoles.length) {
			return false;
		}
		if (guildVerification) {
			if (!guildName) {
				return false;
			}
		}
		return true;
	}

	protected save(): Promise<IVerificationTemplate> {
		return this._VerificationTemplateService.save(this._template as IVerificationTemplate);
	}

	protected getStartPage(): MessageEmbed {
		return super.getStartPage().setTitle('Verification Template Service');
	}

	protected getEndPage(finished?: boolean): MessageEmbed {
		const {
			name,
			verificationChannel,
			logChannel,
			verifiedRoles,
			removeRoles,
			fame,
			rank,
			dungeonRequirements,
			requireHidden,
		} = this._template;

		const embedDescription = !finished ? this._EndPageDescription : '';

		const embed = this._ClientTools.getStandardEmbed().setTitle('End of Verification Template');
		if (embedDescription) {
			embed.setDescription(embedDescription);
		}
		ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Name', value: name, options: { default: 'Unset', inline: true } },
			{ name: 'Verification Channel', value: verificationChannel, options: { default: 'Unset', inline: true } },
			{ name: 'Log Channel', value: logChannel, options: { default: 'Unset', inline: true } },
			ClientTools.LINE_BREAK_FIELD
		);
		if (this._template.guildVerification) {
			ClientTools.addFieldToEmbed(embed, 'Guild Name', this._template.guildName, { inline: true });
			if (this._template.guildRoles?.setRoles) {
				const { founderRole, leaderRole, officerRole, memberRole, initiateRole } = this._template.guildRoles;
				ClientTools.addFieldsToEmbed(
					embed,
					{ name: 'Founder Role', value: founderRole, options: { default: 'Unset', inline: true } },
					{ name: 'Leader Role', value: leaderRole, options: { default: 'Unset', inline: true } },
					{ name: 'Officer Role', value: officerRole, options: { default: 'Unset', inline: true } },
					{ name: 'Member Role', value: memberRole, options: { default: 'Unset', inline: true } },
					{ name: 'Initiate Role', value: initiateRole, options: { default: 'Unset', inline: true } }
				);
			}
			ClientTools.addLineBreakFieldToEmbed(embed);
		}
		ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Verified Roles to Give', value: verifiedRoles, options: { default: 'None', inline: true } },
			{
				name: 'Roles to Remove Upon Verification',
				value: removeRoles,
				options: { default: 'None', inline: true },
			},
			ClientTools.LINE_BREAK_FIELD,
			{ name: 'Fame Requirement', value: fame, options: { inline: true } },
			{ name: 'Rank Requirement', value: rank, options: { inline: true } },
			{ name: 'Require Hidden Location?', value: requireHidden ? 'Yes' : 'No', options: { inline: true } },
			ClientTools.LINE_BREAK_FIELD,
			{
				name: 'Dungeon Requirements',
				value: dungeonRequirementsToStringArray(dungeonRequirements),
				options: { default: 'None', separator: '\n' },
			}
		);

		if (!this.isFinished) {
			ClientTools.addFieldToEmbed(
				embed,
				'Error',
				'Name, Verification Channel, and at least one Verified Role are all required.'
			);
		}

		return embed;
	}

	protected createPageSet(): PageSet<IVerificationTemplate> {
		const pageSet = new PageSet<IVerificationTemplate>(this._template);
		// add start page
		pageSet.addPage(new Page(this.getStartPage()));

		// add body pages
		addVerificationTemplatePages(pageSet, this._template, this.guild);

		// add end page
		pageSet.addPage(
			new DynamicPage(
				{},
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				(fields: Partial<IVerificationTemplate>): MessageEmbed => {
					return this.getEndPage();
				}
			)
		);
		return pageSet;
	}
}
