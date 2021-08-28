import { GuildMember, Message, Role, TextChannel, User } from 'discord.js';
import { inject, injectable } from 'inversify';
import { getBlankVericode } from '../models/vericode';
import { VerificationStatus } from '../models/verification';
import { IVerificationTemplate } from '../models/verification_template';
import { RealmEyeError } from '../realmeye/realmeye_error';
import { Realmeye } from '../realmeye/realmeye';
import { DungeonCompletions, RealmEyePlayerData } from '../realmeye/realmeye_data/realmeye_data_types';
import { UserService } from '../services/user_service';
import { VericodeService } from '../services/vericode_service';
import { VerificationService } from '../services/verification_service';
import { VerificationTemplateService } from '../services/verification_template_service';
import { TYPES } from '../types';
import { ClientTools } from '../utils/client_tools';
import Logger from '../utils/logging';
import { RolesAndChannels } from '../utils/role_and_channel_finder';
import { StringUtils } from '../utils/string_utils';
import { Status } from '../utils/status';
import { VerificationMessenger } from './verification_messenger';
import { MessageParser } from '../utils/message_parser';
import { GuildService } from '../services/guild_service';

export type ManualOverride = {
	overrideInitiator: User;
	initiationChannel: TextChannel;
	overrideGuildCheck: boolean;
	overrideRequirementCheck: boolean;
};

@injectable()
export class VerificationManager {
	private readonly _UserService: UserService;
	private readonly _GuildService: GuildService;
	private readonly _ClientTools: ClientTools;
	private readonly _VerificationService: VerificationService;
	private readonly _VericodeService: VericodeService;
	private readonly _VerificationTemplateService: VerificationTemplateService;
	private readonly _VerificationMessenger: VerificationMessenger;

	public constructor(
		@inject(TYPES.UserService) userService: UserService,
		@inject(TYPES.GuildService) guildService: GuildService,
		@inject(TYPES.ClientTools) clientTools: ClientTools,
		@inject(TYPES.VerificationService) verificationService: VerificationService,
		@inject(TYPES.VericodeService) vericodeService: VericodeService,
		@inject(TYPES.VerificationTemplateService) verificationTemplateService: VerificationTemplateService,
		@inject(TYPES.VerificationMessenger) verificationMessenger: VerificationMessenger
	) {
		this._UserService = userService;
		this._GuildService = guildService;
		this._ClientTools = clientTools;
		this._VerificationService = verificationService;
		this._VericodeService = vericodeService;
		this._VerificationTemplateService = verificationTemplateService;
		this._VerificationMessenger = verificationMessenger;
	}

	/**
	 * Finalizes a verification attempt with a failure.
	 * Finalization includes: updating Verification with FAILURE status and sending failure notification to
	 * both the User and the Guild
	 * @param user User verifying
	 * @param userData User's RealmEyeUserData
	 * @param template VerificationTemplate User is verifying for
	 * @param status Status object with reasons for failure
	 */
	private failTemplateVerification(
		user: GuildMember,
		userData: RealmEyePlayerData,
		template: IVerificationTemplate,
		status: Status<unknown>
	): void {
		this._VerificationService.updateVerificationStatus(user.id, template._id, VerificationStatus.FAILED);
		this._VerificationMessenger.sendTemplateVerificationFailureToUser(user, userData, template, status);
		this._VerificationMessenger.sendTemplateVerificationFailureToGuild(user, userData, template, status);
	}

	/**
	 * Returns the Role that should be assigned to the User based on their rank in the Realm guild.
	 * @param user GuildMember object for User
	 * @param userData User's RealmEyeUserData
	 * @param template VerificationTemplate User is verifying for
	 */
	private getRankRole(user: GuildMember, userData: RealmEyePlayerData, template: IVerificationTemplate): Role {
		if (!template.guildVerification) {
			return;
		}
		switch (userData.guildRank.toUpperCase()) {
			case 'FOUNDER':
				return RolesAndChannels.getRole(user.guild, template.guildRoles.founderRole);
			case 'LEADER':
				return RolesAndChannels.getRole(user.guild, template.guildRoles.leaderRole);
			case 'OFFICER':
				return RolesAndChannels.getRole(user.guild, template.guildRoles.officerRole);
			case 'MEMBER':
				return RolesAndChannels.getRole(user.guild, template.guildRoles.memberRole);
			case 'INITIATE':
				return RolesAndChannels.getRole(user.guild, template.guildRoles.initiateRole);
		}
	}

	/**
	 * Removes all roles that a user was assigned from a given VerificationTemplate
	 * @param user GuildMember object for User to remove roles from
	 * @param template VerificationTemplate to build role list from
	 */
	private async removeVerificationRoles(
		user: GuildMember,
		template: IVerificationTemplate
	): Promise<Status<unknown>> {
		const status = Status.createPending<GuildMember>();

		const promises = [];
		const removedRoles: Role[] = [];

		if (template.guildRoles?.setRoles) {
			const { founderRole, leaderRole, officerRole, memberRole, initiateRole } = template.guildRoles;
			removedRoles.push(
				...RolesAndChannels.getRoles(user.guild, founderRole, leaderRole, officerRole, memberRole, initiateRole)
			);
		}
		removedRoles.push(...RolesAndChannels.getRoles(user.guild, ...template.verifiedRoles));

		if (user.manageable) {
			promises.push(user.roles.remove(removedRoles));
		} else {
			this._VerificationMessenger.sendUserUnmanageableToGuild(user, [], removedRoles, template);
			status.addFailureReason({
				failure: 'User is Unmanageable',
				failureMessage: 'Roles could not be removed because user is unmanageable by Iris Bot.',
			});
		}

		return Promise.all(promises)
			.then(async () => {
				status.addPassingObject(await user.fetch());
				return status.finalize();
			})
			.catch(async (e) => {
				Logger.warn('Error encountered while removing User roles', { errors: e, user: user });
				status.addPassingObject(await user.fetch());
				status.addFailureReason({
					failure: 'Error Updating User',
					failureMessage: 'Unexpected error adding/removing user roles or editing nickname',
				});
				return status.finalize();
			});
	}

	/**
	 * Updates the User's nickname in the verified server to their IGN and adds/removes roles defined in the VerificationTemplate.
	 * Returns a passing Status if no errors occurred during User updating with the updated GuildMember object as the passing object.
	 * Returns a failing Status if any errors occurred with the original GuildMember object as the passing object.
	 * NOTE: If a User is "unmanageable" by the bot (user outranks the bot or the bot does not have the appropriate permissions), a
	 * passing Status is still returned while a message is sent to the Guild's log channel giving details to which roles were unable
	 * to be added/removed.
	 * @param user GuildMember object for User to update
	 * @param userData User's RealmEyeUserData
	 * @param template VerificationTemplate User is verifying for
	 */
	private async updateUserNicknameAndRoles(
		user: GuildMember,
		userData: RealmEyePlayerData,
		template: IVerificationTemplate
	): Promise<Status<GuildMember>> {
		const status = Status.createPending<GuildMember>();

		const promises = [];
		const addedRoles: Role[] = [];
		const removedRoles: Role[] = [];
		if (
			template.guildVerification &&
			template.guildRoles.setRoles &&
			StringUtils.equalsIgnoreCase(userData.guild, template.guildName)
		) {
			const rankRole = this.getRankRole(user, userData, template);
			if (rankRole) {
				addedRoles.push(rankRole);
			}
		}

		addedRoles.push(...RolesAndChannels.getRoles(user.guild, ...template.verifiedRoles));
		removedRoles.push(...RolesAndChannels.getRoles(user.guild, ...template.removeRoles));

		if (user.manageable) {
			promises.push(user.setNickname(userData.name));
			promises.push(
				user.roles.add(addedRoles).then((u) => {
					return u.roles.remove(removedRoles);
				})
			);
		} else {
			this._VerificationMessenger.sendUserUnmanageableToGuild(user, addedRoles, removedRoles, template, userData);
			status.addFailureReason({
				failure: 'User is Unmanageable',
				failureMessage: 'Nickname and roles could not be updated because user is unmanageable by Iris Bot.',
			});
		}

		return Promise.all(promises)
			.then(async () => {
				status.addPassingObject(await user.fetch());
				return status.finalize();
			})
			.catch(async (e) => {
				Logger.warn('Error encountered while updating User roles', { errors: e, user: user });
				status.addPassingObject(await user.fetch());
				status.addFailureReason({
					failure: 'Error Updating User',
					failureMessage: 'Unexpected error adding/removing user roles or editing nickname',
				});
				return status.finalize();
			});
	}

	/**
	 * Performs verification finalization after all checks have passed for a verification attempt.
	 * Finalization includes: updating user nickname and roles in server, updating the VerificationStatus to
	 * VERIFIED in the Verification, and sending success messages to both the User and the Guild the User verified in.
	 * @param user GuildMember object of User to verify
	 * @param userData User's RealmEyeUserData
	 * @param template VerificationTemplate User is verifying for
	 */
	private async completeTemplateVerification(
		user: GuildMember,
		userData: RealmEyePlayerData,
		template: IVerificationTemplate,
		manualOverride?: ManualOverride
	): Promise<void> {
		const userUpdate = await this.updateUserNicknameAndRoles(user, userData, template);
		user = userUpdate.getFirstPassing();
		// TODO: Verify that update is successful and send responses accordingly
		await this._VerificationService.updateVerificationStatus(
			user.id,
			template._id,
			manualOverride ? VerificationStatus.MANUALLY_VERIFIED : VerificationStatus.VERIFIED
		);
		this._VerificationMessenger.sendTemplateVerificationSuccessToUser(user, template);
		this._VerificationMessenger.sendTemplateVerificationSuccessToGuild(user, userData, template, manualOverride);
	}

	/**
	 * Verifies that the user meets the required dungeon completion counts defined in the VerificationTemplate.
	 * Returns a passed Status if all dungeon completion requirements are met, otherwise returns a failed status
	 * with a FailureReason listing all failed dungeons with the required vs actual completions
	 * @param userData User's RealmEyeUserData
	 * @param dungeonRequirements dungeon requirements defined in the VerificationTemplate
	 */
	private verifyDungeonRequirements(
		userData: RealmEyePlayerData,
		dungeonRequirements: DungeonCompletions
	): Status<unknown> {
		const status = Status.createPending();
		let failureReason = '';
		for (const dungeon of Object.keys(dungeonRequirements)) {
			const required = dungeonRequirements[dungeon];
			const completed = userData.dungeonCompletions[dungeon] | 0;
			if (completed < required) {
				failureReason += `**${dungeon}**\t\t| Required: ${required}\t|\tCompleted: ${completed}\n`;
			}
		}
		if (!StringUtils.isEmpty(failureReason)) {
			if (Object.keys(userData.dungeonCompletions).length === 0) {
				failureReason +=
					'Hint: Your graveyard may be set to private.\n' +
					`To change this setting [go here](https://www.realmeye.com/settings-of/${userData.name}) and change \`Who can see my graveyard?\` to \`Everyone\`.`;
			}

			status.addFailureReason({ failure: 'Dungeon Requirements Not Met', failureMessage: failureReason });
		}
		return status.finalize();
	}

	/**
	 * Verifies that the user meets the VerificationTemplate's account requirements defined.
	 * Returns a passed Status if all requirements are met, otherwise returns a failed status with
	 * failure reasons according to each failed requirement.
	 * @param userData User's RealmEyeUserData
	 * @param template Template user is attempting verification for
	 */
	private verifyRequirements(userData: RealmEyePlayerData, template: IVerificationTemplate): Status<unknown> {
		const status = Status.createPending();

		if (userData.rank < template.rank) {
			status.addFailureReason({ failure: 'Rank Too Low', expected: template.rank, actual: userData.rank });
		}
		if (userData.fame < template.fame) {
			status.addFailureReason({ failure: 'Insufficient Fame', expected: template.fame, actual: userData.fame });
		}
		if (template.requireHidden && !StringUtils.equalsIgnoreCase(userData.lastSeen, 'hidden')) {
			status.addFailureReason({
				failure: 'Hidden Location Required',
				failureMessage:
					'Hidden location is required and yours is not.\n' +
					`Hint: To change this setting [go here](https://www.realmeye.com/settings-of/${userData.name}) and change \`Who can see my last known location?\` to **anything except** \`Everyone\`.`,
			});
		}
		status.merge(this.verifyDungeonRequirements(userData, template.dungeonRequirements));
		return status.finalize();
	}

	/**
	 * Verifies that the user is a member of the Realm guild defined in the VerificationTemplate.
	 * Returns a passed Status if they are, otherwise returns a failed Status
	 * @param userData User's RealmEyeUserData
	 * @param template Template user is attempting verification for
	 */
	private verifyUserInTemplateGuild(userData: RealmEyePlayerData, template: IVerificationTemplate): Status<unknown> {
		const status = Status.createPending();
		if (!template.guildVerification) {
			return status.finalize();
		}
		if (StringUtils.equalsIgnoreCase(userData.guild, template.guildName)) {
			status.addFailureReason({ failure: 'Not in Guild', expected: template.guildName, actual: userData.guild });
		}
		return status.finalize();
	}

	// TODO: Error response messages/logging
	/**
	 * Begins the verification process for a user using a single VerificationTemplate. The user must already
	 * have a verified IGN, otherwise no verification can happen.
	 * Will check if the user is verifiable first (including if they are already verified) and return before processing
	 * the full verification.
	 * If the verification is successful, a Verification will be created or updated with VERIFIED status.
	 * If the verification is unsuccessful, a Verification will be created or updated with a FAILED status.
	 * @param user User to verify
	 * @param template Template to use when verifying user
	 */
	public async beginTemplateVerification(
		user: User,
		template: IVerificationTemplate,
		manualOverride?: ManualOverride
	): Promise<void> {
		if (!(await this._UserService.existsByUserId(user.id))) {
			return;
		} else if (!(await this.checkUserIsVerifiable(user, template))) {
			return;
		} else if (!(await this._UserService.hasVerifiedIgn(user.id))) {
			return;
		}

		await this._VerificationService.createQueuedVerification(user.id, template.guildId, template._id);
		const iUser = await this._UserService.findByUserId(user.id);

		const guildMember = await this._ClientTools.findGuildMember(template.guildId, user.id);
		if (!guildMember) {
			Logger.warn('Unable to retrieve GuildMember during verification attempt', {
				user: user,
				template: template,
			});
			// TODO: send user message telling them to go to server to reverify
			return;
		}

		try {
			Realmeye.getRealmEyePlayerData(iUser.ign).then((userData) => {
				const status = Status.createPending();
				if (!manualOverride) {
					if (!manualOverride || !manualOverride.overrideGuildCheck) {
						if (template.guildVerification) {
							status.merge(this.verifyUserInTemplateGuild(userData, template));
						}
					}
					if (!manualOverride || !manualOverride.overrideRequirementCheck) {
						status.merge(this.verifyRequirements(userData, template));
					}
				}
				status.finalize();

				if (status.isPassed) {
					this.completeTemplateVerification(guildMember, userData, template, manualOverride);
				} else {
					this.failTemplateVerification(guildMember, userData, template, status);
				}
			});
		} catch (error) {
			if (error instanceof RealmEyeError) {
				this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
					name: 'RealmEye Error',
					value: error.message,
				});
			} else {
				Logger.error('Unexpected error during template verification', { error: error, user: user });
				this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
					name: 'Unexpected Error',
					value: 'An unexpected error occurred during verification attempt.',
				});
			}
		}
	}

	/**
	 * Will check for any queued verifications a User may have and iterate through them to attempt template verification after verifying IGN
	 * @param user User to check for queued verifications
	 */
	private async processQueuedVerifications(user: User): Promise<void> {
		const queuedVerifications = await this._VerificationService.findByUserIdAndStatus(
			user.id,
			VerificationStatus.QUEUED
		);
		for (const v of queuedVerifications) {
			this._VerificationTemplateService.findById(v.templateId).then((t) => {
				this.beginTemplateVerification(user, t);
			});
		}
	}

	/**
	 * Finishes IGN verification by removing the associated Vericode, updating a User's IGN in DB, sending a success message to the
	 * verified User, and processing queued verifications.
	 * @param user User completing IGN verification
	 * @param userData UserData generated from RealmEye
	 */
	private async completeIgnLinking(user: User, userData: RealmEyePlayerData): Promise<void> {
		this._VericodeService.deleteByUserId(user.id);
		await this._UserService.updateIgn(user, userData.name);
		this._VerificationMessenger.sendIgnLinkingSuccessToUser(user, userData);
		this.processQueuedVerifications(user);
	}

	/**
	 * Begins the attempt to verify the IGN given by the user after they send the '!verify :ign' message.
	 * Retrieves RealmEye data for the given IGN and checks that the description contains the Vericode assigned to the user.
	 * Upon success, will then process any queued verifications and send the user a success message.
	 * Upon failure, will send the user a message with the failure reason.
	 * @param user User attempting IGN verification
	 * @param ign IGN given by the user
	 */
	public async attemptIgnLinking(user: User, ign: string): Promise<void> {
		if (!(await this._VericodeService.existsByUserId(user.id))) {
			if (!(await this._UserService.hasVerifiedIgn(user.id))) {
				this.beginIgnLinking(user);
			} else {
				this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
					name: 'Already Verified IGN',
					value: 'You already have a verified IGN. If you wish to update it, use the `!updateIGN` command instead.',
				});
			}
			return;
		}
		const vericode = await this._VericodeService.findByUserId(user.id);

		try {
			Realmeye.getRealmEyePlayerData(ign).then(async (userData) => {
				if (!userData) {
					Logger.error('RealmEyeUserData is unexpectedly undefined during verification', {
						user: user,
						ign: ign,
					});
					this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
						name: 'Unexpected Error Occurred',
						value:
							'An unexpected error caused verification to fail. Please try again.\n' +
							'If this error persists, contact a bot developer.',
					});
					return;
				}
				if (userData.description?.includes(`IrisBot_${vericode._id}`)) {
					// user description contains vericode

					if (await this._UserService.existsByIgn(userData.name)) {
						// check the ign is not already registered
						// (checking after vericode match to reduce potential abuse of checking if another player has verified with Iris Bot)
						this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
							name: 'IGN Linked to Another User',
							value: `The IGN, [${ign}](${userData.realmEyeUrl}), is already registered to a Discord user. If you believe this is a mistake, reach out to the bot developer.`,
						});
						return;
					}

					this.completeIgnLinking(user, userData);
				} else {
					// user description does not contain vericode
					this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
						name: 'Vericode Not Found',
						value: `The vericode, \`IrisBot_${vericode._id}\`, was not found in [${ign}](${userData.realmEyeUrl})'s RealmEye description...\nPlease try again.`,
					});
				}
			});
		} catch (error) {
			if (error instanceof RealmEyeError) {
				if (error.status) {
					Logger.error('Encountered RealmEyeError', { error: error, user: user, ign: ign });
				}
				this._VerificationMessenger.sendGeneralVerificationFailureToUser(user, {
					name: 'RealmEye Error',
					value: error.message,
				});
			} else if (error instanceof Error) {
				Logger.error('Unexcepted error during attempted ign verification', {
					error: error,
					user: user,
					ign: ign,
				});
			}
		}
	}

	/**
	 * Begins IGN verification process for a user by generating a Vericode and sending the user instructions
	 * @param user User to initiate IGN verification for
	 * @param resetIgn Whether the user is updating their IGN (true) or verifying for the first time (false)
	 */
	public async beginIgnLinking(user: User, resetIgn = false): Promise<void> {
		if (resetIgn) {
			await this._UserService.removeIgn(user);
		}
		const vericode = (await this._VericodeService.existsByUserId(user.id))
			? await this._VericodeService.findByUserId(user.id)
			: await this._VericodeService.save(getBlankVericode({ userId: user.id }));
		this._VerificationMessenger.sendIgnLinkingStartMessageToUser(user, `IrisBot_${vericode._id}`);
	}

	/**
	 * Checks whether the user is in a valid verifiable state in the server/template.
	 * If the user is already verified, returns failing Status as they cannot verify again
	 * If the user is suspended or banned, returns failing Status
	 * Otherwise, return passing Status
	 * @param message Message sent in server by user attempting to verify for a template
	 * @param template Template user attempted verification for
	 */
	private async checkUserIsVerifiable(
		user: User,
		template: IVerificationTemplate
	): Promise<Status<VerificationStatus>> {
		const status = Status.createPending<VerificationStatus>();
		if (!template) {
			status.addFailureReason({
				failure: 'Template Does Not Exist',
				failureMessage: 'Recieved undefined template',
			});
			return status.finalize();
		}
		if (!(await this._VerificationService.existsByUserIdAndTemplateId(user.id, template._id))) {
			status.addPassingObject(VerificationStatus.UNATTEMPTED);
			return status.finalize();
		}
		const verification = await this._VerificationService.findByUserIdAndTemplateId(user.id, template._id);
		switch (verification.status) {
			case VerificationStatus.VERIFIED:
			case VerificationStatus.MANUALLY_VERIFIED:
			case VerificationStatus.SUSPENDED:
			case VerificationStatus.BANNED:
				status.addFailureReason({
					failure: 'Unverifiable',
					failureMessage: `${user} is ${verification.status}`,
				});
				return status.finalize();
			case VerificationStatus.UNVERIFIED:
			case VerificationStatus.FAILED:
			case VerificationStatus.QUEUED:
				status.addPassingObject(verification.status);
				return status.finalize();
		}
	}

	/**
	 * Updates the status of the Verification for the given User, VerificationTemplate pair to UNVERIFIED
	 * and removes any roles that were assigned by the template
	 * NOTE: this uses currently defined roles and not the exact list that were added/removed from the
	 * user during original verification)
	 * @param message Message sent from User unverifying other User
	 * @param verifyingUser GuildMember object of User to unverify
	 * @param template VerificationTemplate to unverify User from
	 * @returns
	 */
	public async beginManualUnverification(
		message: Message,
		verifyingUser: GuildMember,
		template: IVerificationTemplate
	): Promise<void> {
		this._VerificationService.updateVerificationStatus(
			verifyingUser.id,
			template._id,
			VerificationStatus.UNVERIFIED
		);
		this.removeVerificationRoles(verifyingUser, template);
		this._VerificationMessenger.sendTemplateUnverificationSuccessToGuild(verifyingUser, template, message.author);
	}

	/**
	 * Begins a manual verification for a User (usually initiated by a server mod)
	 * This manual verification will override any guild membership requirement or any other verification requirements
	 * NOTE: User being manually verified must have thir IGN linked before or manual verification will fail
	 * @param message Message sent from User verifying other User
	 * @param verifyingUser GuildMember object of User to verify
	 * @param template VerificationTemplate to verify User for
	 * @returns
	 */
	public async beginManualVerification(
		message: Message,
		verifyingUser: User,
		template: IVerificationTemplate
	): Promise<void> {
		if (!(message.channel instanceof TextChannel)) {
			return;
		}
		const status = await this.checkUserIsVerifiable(verifyingUser, template);
		if (status.isFailed) {
			this._VerificationMessenger.sendGeneralVerificationFailureToGuild(
				message.channel,
				...status.failureReasons
			);
		}

		if (await this._UserService.hasVerifiedIgn(verifyingUser.id)) {
			// user has already completed ign verification
			const manualOverride: ManualOverride = {
				overrideInitiator: message.author,
				initiationChannel: message.channel,
				overrideGuildCheck: true,
				overrideRequirementCheck: true,
			};
			this.beginTemplateVerification(verifyingUser, template, manualOverride);
		} else {
			this._VerificationMessenger.sendGeneralVerificationFailureToGuild(message.channel, {
				name: 'User IGN Not Linked',
				value:
					`${verifyingUser} has not linked their IGN with Iris Bot yet. ` +
					'They must do this before any verification can be started.',
			});
		}
	}

	/**
	 * Performs prechecks necessary before a manual command can be initiated, such as that the
	 * given User id is valid and that a VerificationTemplate with the given name exists in the guild.
	 * If the prechecks pass, the manual command will be initiated
	 * @param message Message sent by User performing manual command
	 * @param args parsed arguments included in the message sent
	 * @param command which manual command to perform after prechecks
	 * @returns
	 */
	public async beginManualCommand(message: Message, args: string[], command: 'verify' | 'unverify'): Promise<void> {
		if (!(message.channel instanceof TextChannel)) {
			return;
		}
		const template = await this._VerificationTemplateService.findTemplateByGuildIdAndName(
			message.guild.id,
			args[2],
			false
		);
		if (!template) {
			Logger.debug(
				'No VerificationTemplate found during attempted manual verification... Aborting verification',
				{ guild: message.guild, args: args }
			);
			this._VerificationMessenger.sendGeneralVerificationFailureToGuild(message.channel, {
				name: 'Template Not Found',
				value: `Template with name, ${args[2]}, not found in guild.`,
			});
			return;
		}

		const userId = MessageParser.parseUserId(args[1]);
		const verifyingUser = await ClientTools.findGuildMember(message.guild, userId);
		if (!userId || !verifyingUser) {
			Logger.debug('Invalid user id given during attempted manual verification... Aborting verification', {
				guild: message.guild,
				args: args,
			});
			this._VerificationMessenger.sendGeneralVerificationFailureToGuild(message.channel, {
				name: 'Invalid User',
				value: `No user matching ${args[1]} could be found in this guild.`,
			});
			return;
		}

		if (command === 'verify') {
			this.beginManualVerification(message, verifyingUser.user, template);
		} else if (command === 'unverify') {
			this.beginManualUnverification(message, verifyingUser, template);
		}
	}

	/**
	 * Beings verification process for a user in a server initiated by a '!verify' command in an appropriate verification channel
	 * @param message Message sent by user in the attempted verification channel
	 */
	public async beginVerification(message: Message): Promise<void> {
		if (message.deletable) {
			message.delete();
		}

		const template = await this._VerificationTemplateService.findByVerificationChannel(message.channel.toString());
		if (!template) {
			Logger.warn('No VerificationTemplate found during attempted verification... Aborting verification', {
				guild: message.guild,
				channel: message.channel,
			});
			return;
		}

		const status = await this.checkUserIsVerifiable(message.author, template);
		if (status.isFailed) {
			this._VerificationMessenger.sendGeneralVerificationFailureToUser(message.author, ...status.failureReasons);
		}

		if (await this._UserService.hasVerifiedIgn(message.author.id)) {
			// user has already completed ign verification
			this.beginTemplateVerification(message.author, template);
		} else {
			// user has not completed ign verification
			this._VerificationService.createQueuedVerification(message.author.id, message.guild.id, template._id);
			this.beginIgnLinking(message.author);
		}
	}

	public async handleMessage(message: Message, args: string[]): Promise<void> {
		if (args.length < 1) {
			return;
		}

		const command = args[0].toUpperCase();

		switch (command) {
			case 'VERIFY': // verify
				if (await this._VerificationTemplateService.existsByVerificationChannel(message.channel.toString())) {
					this.beginVerification(message);
				}
				break;
			case 'MANUALVERIFY': // manualVerify :user :templateName
				if (!(await this._GuildService.isMod(message.guild, message.author.id))) {
					return;
				}
				if (args.length < 3 || !(message.channel instanceof TextChannel)) {
					return;
				}
				this.beginManualCommand(message, args, 'verify');
				break;
			case 'MANUALUNVERIFY': // unverify :user :templateName
				if (!(await this._GuildService.isMod(message.guild, message.author.id))) {
					return;
				}
				if (args.length < 3 || !(message.channel instanceof TextChannel)) {
					return;
				}
				this.beginManualCommand(message, args, 'unverify');
				break;
		}
	}
}
