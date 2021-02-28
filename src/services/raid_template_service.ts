import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { IRaidTemplate } from '../models/templates/raid_template';
import { RaidTemplateRepository } from '../data_access/repositories/raid_template_repository';

@injectable()
export class RaidTemplateService {

    private readonly _raidTemplateRepo: RaidTemplateRepository;

    public constructor(
        @inject(TYPES.RaidTemplateRepository) raidTemplateRepo: RaidTemplateRepository
    ) {
        this._raidTemplateRepo = raidTemplateRepo;
    }
    
    public async existsByName(guildId: string, templateName: string, caseSensitive = true): Promise<boolean> {
        return this._raidTemplateRepo.existsByName(guildId, templateName, caseSensitive);
    }

    /**
     * Returns a RaidTemplate given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to delete
     */
    public async findTemplate(guildId: string, templateName: string, caseSensitive = true): Promise<IRaidTemplate> {
        return this._raidTemplateRepo.findTemplate(guildId, templateName, caseSensitive);
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
    public async save(template: IRaidTemplate): Promise<boolean> {
        return this._raidTemplateRepo.save(template);
    }

    /**
     * Deletes a RaidTemplate given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to delete
     */
    public async deleteTemplate(guildId: string, templateName: string, caseSensitive = true): Promise<boolean> {
        return this._raidTemplateRepo.deleteTemplate(guildId, templateName, caseSensitive);
    }
}