import { GuildMember, MessageEmbed, Role, TextChannel, User } from 'discord.js';
import { inject, injectable } from 'inversify';
import { IVerificationTemplate } from '../models/verification_template';
import { RealmEyePlayerData } from '../realmeye/realmeye_data/realmeye_data_types';
import { TYPES } from '../types';
import { ClientTools, EmbedField } from '../utils/client_tools';
import { RolesAndChannels } from '../utils/role_and_channel_finder';
import { FailureReason, Status } from '../utils/status';
import { ManualOverride } from './verification_manager';

@injectable()
export class VerificationMessenger {
	private readonly _ClientTools: ClientTools;

	public constructor(@inject(TYPES.ClientTools) clientTools: ClientTools) {
		this._ClientTools = clientTools;
	}

	private buildGeneralVerificationFailureEmbed(...reasons: EmbedField[] | FailureReason[]): MessageEmbed {
		const embed = this._ClientTools
			.getStandardEmbed()
			.setTitle('Verification Error')
			.setDescription('There was an error encountered during verification.');
		for (let reason of reasons) {
			if ((reason as FailureReason).failure) {
				reason = reason as FailureReason;
				this._ClientTools.addFieldToEmbed(
					embed,
					reason.failure,
					reason.failureMessage
						? reason.failureMessage
						: `Expected: ${reason.expected}, Actual: ${reason.actual}`
				);
			} else {
				reason = reason as EmbedField;
				this._ClientTools.addFieldsToEmbed(embed, reason);
			}
		}
		return embed;
	}

	public sendGeneralVerificationFailureToGuild(
		channel: TextChannel,
		...reasons: EmbedField[] | FailureReason[]
	): void {
		channel.send({ embeds: [this.buildGeneralVerificationFailureEmbed(...reasons)] });
	}

	public sendGeneralVerificationFailureToUser(user: User, ...reasons: EmbedField[] | FailureReason[]): void {
		user.send({ embeds: [this.buildGeneralVerificationFailureEmbed(...reasons)] });
	}

	public sendIgnLinkingStartMessageToUser(user: User, vericode: string): void {
		user.send({
			embeds: [
				this._ClientTools
					.getStandardEmbed()
					.setTitle('IGN Linking Started')
					.setDescription(
						'Thank you for beginning your verification process with Iris Bot!.' +
							' Once this verification is complete, your IGN will be saved for future use.'
					)
					.addFields(
						{
							name: 'Step 1',
							value: `[Login to your RealmEye account](https://www.realmeye.com/log-in) and put \`${vericode}\` in any part of your description.`,
						},
						{ name: 'Step 2', value: 'Come back here and reply with `!verify :ign`.' },
						{
							name: 'Step 3',
							value: 'Once completed successfully, you will receive a message verifying completion!',
						}
					),
			],
		});
	}

	public sendInvalidIgnLinkingCommandToUser(user: User): void {
		user.send({
			embeds: [
				this._ClientTools
					.getStandardEmbed()
					.setTitle('Invalid Command')
					.setDescription(
						'In order to link your IGN, you need to include your IGN in the command, such as `!verify :ign`.\n' +
							'If you wish to add or update your IGN, use the command `!updateIGN` and follow the steps.'
					),
			],
		});
	}

	public sendIgnLinkingSuccessToUser(user: User, userData: RealmEyePlayerData): void {
		user.send({
			embeds: [
				this._ClientTools
					.getStandardEmbed()
					.setTitle('IGN Linking Success')
					.setDescription(
						`Congratulations! You have successfully linked [${userData.name}](${userData.realmEyeUrl}) with Iris Bot!\n` +
							'You can now verify in any verification channel using this bot.'
					)
					.addField(
						'Updating Your IGN',
						'If you ever need to update your IGN, just type `!updateIGN` in this DM channel' +
							' or any verification channel used by Iris Bot'
					),
			],
		});
	}

	public sendTemplateVerificationSuccessToUser(user: GuildMember, template: IVerificationTemplate): void {
		user.send({
			embeds: [
				this._ClientTools
					.getStandardEmbed()
					.setTitle('Verified!')
					.setDescription(
						`Congratulations! You have been verified in **${user.guild}**:${template.verificationChannel}`
					),
			],
		});
	}

	public sendTemplateVerificationSuccessToGuild(
		user: GuildMember,
		userData: RealmEyePlayerData,
		template: IVerificationTemplate,
		manualOverride?: ManualOverride
	): void {
		const logChannel = RolesAndChannels.getChannel(user.guild, template.logChannel, 'GUILD_TEXT') as TextChannel;
		const embed = this._ClientTools
			.getStandardEmbed()
			.setTitle(`${user.displayName} Has Been Verified!`)
			.setURL(`https://www.realmeye.com/player/${userData.name}`);

		if (manualOverride) {
			embed.setDescription(
				`${user} has been manually verified for ${template.name} in ${template.verificationChannel} as ${userData.name} by ${manualOverride.overrideInitiator}`
			);
		} else {
			embed.setDescription(
				`${user} has just verified for ${template.name} in ${template.verificationChannel} as ${userData.name}`
			);
		}

		this._ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Server Name', value: user.displayName, options: { inline: true } },
			{ name: 'Discord Tag', value: user.user.tag, options: { inline: true } },
			{ name: 'Discord Id', value: user.id, options: { inline: true } },
			{ name: 'Roles', value: user.roles.cache.values(), options: { separator: ' ' } }
		);
		logChannel.send({ embeds: [embed] });
	}

	public sendUserUnmanageableToGuild(
		user: GuildMember,
		addedRoles: Role[],
		removedRoles: Role[],
		template: IVerificationTemplate,
		userData?: RealmEyePlayerData
	): void {
		const logChannel = RolesAndChannels.getChannel(user.guild, template.logChannel, 'GUILD_TEXT') as TextChannel;
		const embed = this._ClientTools
			.getStandardEmbed()
			.setTitle(`${user.displayName} is Unmanageable`)
			.setDescription(
				`${user} is unmanageable either because the user outranks Iris Bot or because Iris Bot is lacking the ` +
					'appropriate permissions to manage user nicknames and roles.'
			);
		if (userData) {
			this._ClientTools.addFieldToEmbed(embed, 'Attempted Name Change', userData.name, { inline: true });
		}
		this._ClientTools.addFieldsToEmbed(
			embed,
			{ name: 'Attempted Roles Added', value: addedRoles, options: { separator: ' ', inline: true } },
			{ name: 'Attempted Roles Removed', value: removedRoles, options: { separator: ' ', inline: true } }
		);
		logChannel.send({ embeds: [embed] });
	}

	private addFailureReasonsToEmbed(
		embed: MessageEmbed,
		status: Status<unknown>,
		sendTo: 'user' | 'guild'
	): MessageEmbed {
		for (const f of status.failureReasons) {
			let message = '';
			if (f.expected != undefined && f.actual != undefined) {
				message = `Expected: **${f.expected}**\t|\tActual: **${f.actual}**`;
			} else {
				message = f.failureMessage;

				if (sendTo === 'guild') {
					// removes user hints if sending to guild
					const match = f.failureMessage.match(/(((?!hint:).)*)/gis);
					if (match && match[0]) {
						message = match[0];
					}
				}
			}
			this._ClientTools.addFieldToEmbed(embed, f.failure, message);
		}
		return embed;
	}

	public sendTemplateVerificationFailureToUser(
		user: GuildMember,
		userData: RealmEyePlayerData,
		template: IVerificationTemplate,
		status: Status<unknown>
	): void {
		const embed = this._ClientTools
			.getStandardEmbed()
			.setTitle('Verification Failed')
			.setURL(userData.realmEyeUrl)
			.setDescription(
				`You failed to verify in **${user.guild}**:${template.verificationChannel} for the following reasons:`
			);
		this.addFailureReasonsToEmbed(embed, status, 'user');
		user.send({ embeds: [embed] });
	}

	public sendTemplateVerificationFailureToGuild(
		user: GuildMember,
		userData: RealmEyePlayerData,
		template: IVerificationTemplate,
		status: Status<unknown>
	): void {
		const logChannel = RolesAndChannels.getChannel(user.guild, template.logChannel, 'GUILD_TEXT') as TextChannel;
		const embed = this._ClientTools
			.getStandardEmbed()
			.setTitle(`${user.displayName} Failed Verification`)
			.setURL(userData.realmEyeUrl)
			.setDescription(
				`${user} failed to verify for ${template.name} in ${template.verificationChannel} for the following reasons:`
			);
		this.addFailureReasonsToEmbed(embed, status, 'guild');
		logChannel.send({ embeds: [embed] });
	}

	public sendTemplateUnverificationSuccessToGuild(
		user: GuildMember,
		template: IVerificationTemplate,
		initiatingUser: User
	): void {
		const logChannel = RolesAndChannels.getChannel(user.guild, template.logChannel, 'GUILD_TEXT') as TextChannel;
		const embed = this._ClientTools
			.getStandardEmbed()
			.setTitle(`${user.displayName} Successfully Unverified`)
			.setDescription(`${user} has been unverified for ${template.name} by ${initiatingUser}.`);
		logChannel.send({ embeds: [embed] });
	}
}
