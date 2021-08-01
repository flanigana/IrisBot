import { inject, injectable } from "inversify";
import { ObjectID } from "mongodb";
import { VerificationRepository } from "../data_access/repositories/verification_repository";
import { IVerification, VerificationStatus } from "../models/verification";
import { TYPES } from "../types";

@injectable()
export class VerificationService {

    private readonly _VerificationRepo: VerificationRepository;

    public constructor(
        @inject(TYPES.VerificationRepository) verificationRepo: VerificationRepository
    ) {
        this._VerificationRepo = verificationRepo;
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