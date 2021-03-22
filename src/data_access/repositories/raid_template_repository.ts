import { injectable } from "inversify";
import { getBlankRaidTemplate, IRaidTemplate, RaidTemplate, RaidTemplateDoc } from "../../models/raid_template";
import { TemplateRepository } from "./generics/template_repository";

@injectable()
export class RaidTemplateRepository extends TemplateRepository<IRaidTemplate, RaidTemplateDoc> {

    public constructor() {
        super(RaidTemplate);
    }
}