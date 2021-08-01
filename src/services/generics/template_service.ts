import { injectable, unmanaged } from "inversify";
import { ObjectID } from "mongodb";
import { ObjectId } from "mongoose";
import { TemplateRepository } from "../../data_access/repositories/generics/template_repository";
import { GuildTemplate } from "../../models/interfaces/data_model";

@injectable()
export class TemplateService<T extends GuildTemplate> {

    protected readonly _TemplateRepo: TemplateRepository<T>;

    public constructor(
        @unmanaged() templateRepo: TemplateRepository<T>
    ) {
        this._TemplateRepo = templateRepo;
    }

    /**
     * Checks whether a template with the given name exists in the Guild
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to check existence of
     * @param caseSensitive whether to check as case-sensitive search
     */
    public async existsByName(guildId: string, templateName: string, caseSensitive = true): Promise<boolean> {
        return this._TemplateRepo.existsByName(guildId, templateName, caseSensitive);
    }

    /**
     * Returns a Template given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to find
     */
    public async findTemplateByGuildIdAndName(guildId: string, templateName: string, caseSensitive = true): Promise<T> {
        return this._TemplateRepo.findTemplate(guildId, templateName, caseSensitive);
    }
    

    /**
     * Returns a list of Templates created by the Guild with the given id
     * @param guild Guild to search for owned Templates
     */
    public async findTemplatesByGuildId(guildId: string): Promise<T[]> {
        return this._TemplateRepo.findTemplatesByGuildId(guildId);
    }

    /**
     * Checks whether a template with the given id exists
     * @param templateId Template id to search for
     */
    public async existsById(templateId: ObjectID): Promise<boolean> {
        return this._TemplateRepo.existsById(templateId);
    }

    /**
     * Returns a Template with the given id
     * @param templateId Template id to search for 
     */
    public async findById(templateId: ObjectID): Promise<T> {
        return this._TemplateRepo.findById(templateId);
    }

    /**
     * Creates or updates the given Template in the database
     * @param template Template to save
     */
    public async save(template: T): Promise<T> {
        return this._TemplateRepo.save(template);
    }

    /**
     * Deletes a Template given the owning guild and the template name
     * @param guildId id of the template-owning Guild
     * @param templateName name of the template to delete
     */
    public async deleteTemplate(guildId: string, templateName: string, caseSensitive = true): Promise<boolean> {
        return this._TemplateRepo.deleteTemplate(guildId, templateName, caseSensitive);
    }
}