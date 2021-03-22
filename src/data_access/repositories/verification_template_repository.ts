import { injectable } from "inversify";
import { getBlankVerificationTemplate, IVerificationTemplate, VerificationTemplate, VerificationTemplateDoc } from "../../models/verification_template";
import { TemplateRepository } from "./generics/template_repository";

@injectable()
export class VerificationTemplateRepository extends TemplateRepository<IVerificationTemplate, VerificationTemplateDoc> {

    public constructor() {
        super(VerificationTemplate);
    }
}