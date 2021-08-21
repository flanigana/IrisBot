import { injectable } from "inversify";
import { IRaidTemplate, RaidTemplate } from "../../models/raid_template";
import { TemplateRepository } from "./generics/template_repository";

@injectable()
export class RaidTemplateRepository extends TemplateRepository<IRaidTemplate> {

    public constructor() {
        super(RaidTemplate);
    }
}