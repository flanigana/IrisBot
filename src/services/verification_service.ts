import { inject, injectable } from "inversify";
import { ObjectID } from "mongodb";
import { VerificationRepository } from "../data_access/repositories/verification_repository";
import { getBlankVerification, IVerification, VerificationStatus } from "../models/verification";
import { TYPES } from "../types";

@injectable()
export class VerificationService {

    private readonly _VerificationRepo: VerificationRepository;

    public constructor(
        @inject(TYPES.VerificationRepository) verificationRepo: VerificationRepository
    ) {
        this._VerificationRepo = verificationRepo;
    }

    /**
     * Creates a new Verification with the given user, guild, and template ids
     * Checks that a Verification with the ids does not already exist and if it does, returns it instead
     * @param userId User id
     * @param guildId Guild id
     * @param templateId VerificationTemplate id
     * @returns 
     */
    public async createQueuedVerification(userId: string, guildId: string, templateId: ObjectID): Promise<IVerification> {
        if (await this.existsByUserIdAndTemplateId(userId, templateId)) {
            return this.findByUserIdAndTemplateId(userId, templateId);
        }
        const verification = getBlankVerification({
            userId: userId,
            guildId: guildId,
            templateId: templateId,
            status: VerificationStatus.QUEUED
        });
        return this.save(verification);
    }

    /**
     * Updates the Verification with the given user id and template id to the given status
     * @param userId User id
     * @param templateId VerificationTemplate id
     * @param status new status
     */
    public async updateVerificationStatus(userId: string, templateId: ObjectID, status: VerificationStatus): Promise<IVerification> {
        if (!(await this.existsByUserIdAndTemplateId(userId, templateId))) {
            return;
        }
        const verification = await this.findByUserIdAndTemplateId(userId, templateId);
        verification.status = status;
        return this.save(verification);
    }

    public async existsByUserIdAndTemplateId(userId: string, templateId: ObjectID): Promise<boolean> {
        return this._VerificationRepo.existsByUserIdAndTemplateId(userId, templateId);
    }

    public async findByUserIdAndTemplateId(userId: string, templateId: ObjectID): Promise<IVerification> {
        return this._VerificationRepo.findByUserIdAndTemplateId(userId, templateId);
    }

    public async findByUserIdAndStatus(userId: string, status: VerificationStatus): Promise<IVerification[]> {
        return this._VerificationRepo.findByUserIdAndStatus(userId, status);
    }

    public async existsByUserId(userId: string): Promise<boolean> {
        return this._VerificationRepo.existsByUserId(userId);
    }

    public async findByUserId(userId: string): Promise<IVerification[]> {
        return this._VerificationRepo.findByUserId(userId);
    }

    public async findByTemplateId(templateId: ObjectID): Promise<IVerification[]> {
        return this._VerificationRepo.findByTemplateId(templateId);
    }

    public async save(verification: IVerification): Promise<IVerification> {
        return this._VerificationRepo.save(verification);
    }
}