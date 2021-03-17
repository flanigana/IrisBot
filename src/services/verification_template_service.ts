import { inject, injectable } from "inversify";
import { VerificationTemplateRepository } from "../data_access/repositories/verification_template_repository";
import { IVerificationTemplate } from "../models/verification_template";
import { TYPES } from "../types";
import { TemplateService } from "./generics/template_service";

@injectable()
export class VerificationTemplateService extends TemplateService<IVerificationTemplate> {

    public constructor(
        @inject(TYPES.VerificationTemplateRepository) verificationTemplateRepo: VerificationTemplateRepository
    ) {
        super(verificationTemplateRepo);
    }
}