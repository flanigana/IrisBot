import { injectable } from "inversify";
import { ObjectID } from "mongodb";
import { IVerification, Verification } from "../../models/verification";
import { GenericRepository } from "./generics/generic_repository";

@injectable()
export class VerificationRepository extends GenericRepository<IVerification> {
    
    public constructor() {
        super(Verification);
    }

    public async existsByUserIdAndTemplateId(userId: string, templateId: ObjectID): Promise<boolean> {
        return this.existsByQuery({userId: userId, templateId: templateId});
    }

    public async findByUserIdAndTemplateId(userId: string, templateId: ObjectID): Promise<IVerification> {
        return this.findByQuery({userId: userId, templateId: templateId});
    }

    public async existsByUserId(userId: string): Promise<boolean> {
        return this.existsByQuery({userId: userId});
    }

    public async findByUserId(userId: string): Promise<IVerification[]> {
        return this.findManyByQuery({userId: userId});
    }

    public async findByTemplateId(templateId: ObjectID): Promise<IVerification[]> {
        return this.findManyByQuery({templateId: templateId});
    }
}