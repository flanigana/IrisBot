import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { RaidTemplate, IRaidTemplate } from '../models/raid_template';
import { RaidTemplateRepository } from '../data_access/repositories/raid_template_repository';

@injectable()
export class RaidTemplateService {

    private readonly _raidTemplateRepo: RaidTemplateRepository;

    public constructor(
        @inject(TYPES.RaidTemplateRepository) raidTemplateRepo: RaidTemplateRepository
    ) {
        this._raidTemplateRepo = raidTemplateRepo;
    }
    

    /**
     * Returns a RaidTemplate given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to delete
     */
    public async findTemplate(guildId: string, templateName: string): Promise<IRaidTemplate> {
        return this._raidTemplateRepo.findTemplate(guildId, templateName);
    }
    

    /**
     * Returns a list of RaidTemplates created by the Guild with the given id
     * @param guild Guild to search for owned RaidTemplates
     */
    public async findTemplatesByGuildId(guildId: string): Promise<IRaidTemplate[]> {
        return this._raidTemplateRepo.findTemplatesByGuildId(guildId);
    }

    /**
     * Creates or updates the given RaidTemplate in the database
     * @param template RaidTemplate to save
     */
    public async save(template: IRaidTemplate): Promise<IRaidTemplate> {
        return this._raidTemplateRepo.save(RaidTemplate.build(template));
    }

    /**
     * Deletes a RaidTemplate given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to delete
     */
    public async deleteTemplate(guildId: string, templateName: string): Promise<boolean> {
        return this._raidTemplateRepo.deleteTemplate(guildId, templateName);
    }
}