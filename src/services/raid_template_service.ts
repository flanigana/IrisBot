import { inject, injectable } from 'inversify';
import { TYPES } from '../types';
import { IRaidTemplate } from '../models/templates/raid_template';
import { RaidTemplateRepository } from '../data_access/repositories/raid_template_repository';
import { ClientTools } from '../utilities/client_tools';

@injectable()
export class RaidTemplateService {

    private readonly _RaidTemplateRepo: RaidTemplateRepository;
    private readonly _ClientTools: ClientTools;

    public constructor(
        @inject(TYPES.RaidTemplateRepository) raidTemplateRepo: RaidTemplateRepository,
        @inject(TYPES.ClientTools) clientTools: ClientTools
    ) {
        this._RaidTemplateRepo = raidTemplateRepo;
        this._ClientTools = clientTools;
    }

    /**
     * Checks whether a template with the given name exists in the Guild
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to check existence of
     * @param caseSensitive whether to check as case-sensitive search
     */
    public async existsByName(guildId: string, templateName: string, caseSensitive = true): Promise<boolean> {
        return this._RaidTemplateRepo.existsByName(guildId, templateName, caseSensitive);
    }

    /**
     * Returns a RaidTemplate given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to find
     */
    public async findTemplate(guildId: string, templateName: string, caseSensitive = true): Promise<IRaidTemplate> {
        return this._RaidTemplateRepo.findTemplate(guildId, templateName, caseSensitive);
    }
    

    /**
     * Returns a list of RaidTemplates created by the Guild with the given id
     * @param guild Guild to search for owned RaidTemplates
     */
    public async findTemplatesByGuildId(guildId: string): Promise<IRaidTemplate[]> {
        return this._RaidTemplateRepo.findTemplatesByGuildId(guildId);
    }

    /**
     * Creates or updates the given RaidTemplate in the database
     * @param template RaidTemplate to save
     */
    public async save(template: IRaidTemplate): Promise<boolean> {
        return this._RaidTemplateRepo.save(template);
    }

    /**
     * Deletes a RaidTemplate given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to delete
     */
    public async deleteTemplate(guildId: string, templateName: string, caseSensitive = true): Promise<boolean> {
        return this._RaidTemplateRepo.deleteTemplate(guildId, templateName, caseSensitive);
    }
}