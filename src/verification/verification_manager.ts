import { Message, TextChannel, User } from "discord.js";
import { inject, injectable } from "inversify";
import { getBlankVericode } from "../models/vericode";
import { getBlankVerification, VerificationStatus } from "../models/verification";
import { IVerificationTemplate } from "../models/verification_template";
import { RealmEyeError } from "../realmeye/realmeye_exception";
import { RealmEyeService } from "../realmeye/realmeye_service";
import { UserData } from "../realmeye/realmeye_types";
import { UserService } from "../services/user_service";
import { VericodeService } from "../services/vericode_service";
import { VerificationService } from "../services/verification_service";
import { VerificationTemplateService } from "../services/verification_template_service";
import { TYPES } from "../types";
import Logger from '../utilities/logging';
import { VerificationMessenger } from "./verification_messenger";

@injectable()
export class VerificationManager {

    private readonly _UserService: UserService;
    private readonly _VerificationService: VerificationService;
    private readonly _VericodeService: VericodeService;
    private readonly _VerificationTemplateService: VerificationTemplateService;
    private readonly _VerificationMessenger: VerificationMessenger;
    private readonly _RealmEyeService: RealmEyeService;

    public constructor(
        @inject(TYPES.UserService) userService: UserService,
        @inject(TYPES.VerificationService) verificationService: VerificationService,
        @inject(TYPES.VericodeService) vericodeService: VericodeService,
        @inject(TYPES.VerificationTemplateService) verificationTemplateService:  VerificationTemplateService,
        @inject(TYPES.VerificationMessenger) verificationMessenger: VerificationMessenger,
        @inject(TYPES.RealmEyeService) realmEyeService: RealmEyeService
    ) {
        this._UserService = userService;
        this._VerificationService = verificationService;
        this._VericodeService = vericodeService;
        this._VerificationTemplateService = verificationTemplateService;
        this._VerificationMessenger = verificationMessenger;
        this._RealmEyeService = realmEyeService;
    }

    public async beginTemplateVerification(user: User, template: IVerificationTemplate): Promise<void> {

    }

    private async processQueuedVerifications(user: User): Promise<void> {
        (await this._VerificationService.findByUserIdAndStatus(user.id, VerificationStatus.QUEUED)).forEach(async verification => {
            this._VerificationTemplateService.findById(verification.templateId).then(template => {
                this.beginTemplateVerification(user, template);
            });
        });
    }

    private async completeIgnVerification(user: User, userData: UserData): Promise<void> {
        this._VericodeService.deleteByUserId(user.id);
        this._UserService.updateIgn(user, userData.name);
        this._VerificationMessenger.sendIgnVerificationSuccessToUser(user, userData);
        this.processQueuedVerifications(user);
    }

    public async attemptIgnVerification(user: User, ign: string): Promise<void> {
        if (!(await this._VericodeService.existsByUserId(user.id))) {
            if (!(await this._UserService.hasVerifiedIgn(user.id))) {
                this.beginIgnVerification(user);
            } else {
                this._VerificationMessenger.sendGeneralVerificationFailureToUser(
                    user,
                    {name: 'Already Verified IGN', value: 'You already have a verified IGN. If you wish to update it, use the \`!updateIGN\` command instead.'}
                );
            }
            return;
        }
        const vericode = await this._VericodeService.findByUserId(user.id);

        try {
            this._RealmEyeService.getRealmEyeUserData(ign).then(async userData => {
                if (userData?.description?.includes(`IrisBot_${vericode._id}`)) {
                    // user description contains vericode

                    if (await this._UserService.existsByIgn(ign)) {
                        // check the ign is not already registered
                        // (checking after vericode match to reduce potential abuse of checking if another player has verified with Iris Bot)
                        this._VerificationMessenger.sendGeneralVerificationFailureToUser(
                            user,
                            {name: 'IGN Already Verified', value: `The IGN, [${ign}](${userData.realmEyeUrl}), is alrady registered to a Discord user. If you believe this is a mistake, reach out to the bot developer.`});
                        return;
                    }

                    this.completeIgnVerification(user, userData);

                } else {
                    // user description does not contain vericode
                    this._VerificationMessenger.sendGeneralVerificationFailureToUser(
                        user,
                        {
                            name: 'Vericode Not Found',
                            value: `The vericode, \`IrisBot_${vericode._id}\`, was not found in [${ign}](${userData.realmEyeUrl})'s RealmEye description...\nPlease try again.`
                        }
                    );
                }
            });

        } catch (exception) {
            if (exception instanceof RealmEyeError) {
                this._VerificationMessenger.sendGeneralVerificationFailureToUser(
                    user,
                    {name: 'RealmEye Error', value: exception.message});
            }
        }
    }

    public async beginIgnVerification(user: User, resetIgn = false): Promise<void> {
        if (resetIgn) {
            await this._UserService.removeIgn(user);
        }
        const vericode = await this._VericodeService.existsByUserId(user.id) ?
                            await this._VericodeService.findByUserId(user.id) :
                            await this._VericodeService.save(getBlankVericode({userId: user.id}));
        this._VerificationMessenger.sendIgnVerificationStartMessageToUser(user, `IrisBot_${vericode._id}`);
    }

    private async queueVerification(message: Message, template: IVerificationTemplate): Promise<void> {
        const verification = getBlankVerification({
            userId: message.author.id,
            templateId: template._id,
            status: VerificationStatus.QUEUED
        });
        this._VerificationService.save(verification);
    }

    private async checkUserIsVerifiable(message: Message, template: IVerificationTemplate): Promise<boolean> {
        if (!(await this._VerificationService.existsByUserIdAndTemplateId(message.author.id, template._id))) {
            return true;
        }
        const verification = await this._VerificationService.findByUserIdAndTemplateId(message.author.id, template._id);
        switch (verification.status) {
            case VerificationStatus.VERIFIED:
                this._VerificationMessenger.sendTemplateAlreadyVerifiedMessageToUser(message.author, message.guild, message.channel as TextChannel);
                return false;
            case VerificationStatus.SUSPENDED:
            case VerificationStatus.BANNED:
                this._VerificationMessenger.sendGeneralVerificationFailureToUser(
                    message.author, 
                    {name: verification.status, value:`You are ${verification.status.toLowerCase()} in ${message.guild}`});
                return false;
            case VerificationStatus.UNVERIFIED:
            case VerificationStatus.QUEUED:
                return true;
        }
    }

    public async beginVerification(message: Message): Promise<void> {
        if (message.deletable) {
            message.delete();
        }

        const template = await this._VerificationTemplateService.findByVerificationChannel(message.channel.toString());

        if (!(await this.checkUserIsVerifiable(message, template))) {
            return;
        }

        if (await this._UserService.hasVerifiedIgn(message.author.id)) {
            // user has already completed ign verification
            this.beginTemplateVerification(message.author, template);
        } else {
            // user has not completed ign verification
            this.queueVerification(message, template);
            this.beginIgnVerification(message.author);
        }
    }

    public async handleMessage(message: Message, args: string[]): Promise<void> {
        if (args.length < 1) {
            return;
        }

        const command = args[0].toLowerCase();

        switch (command) {
            case "verify":
                if (await this._VerificationTemplateService.existsByVerificationChannel(message.channel.toString())) {
                    this.beginVerification(message);
                }
                break;
        }
    }
}