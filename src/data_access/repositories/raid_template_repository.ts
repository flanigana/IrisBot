import { injectable } from 'inversify';
import { Query } from './repositories';
import { GenericRepository } from './generic_repository';
import { RaidTemplate, RaidTemplateDoc, IRaidTemplate } from '../../models/templates/raid_template';

@injectable()
export class RaidTemplateRepository
    extends GenericRepository<IRaidTemplate, RaidTemplateDoc> {
    
    public constructor() {
        super(RaidTemplate);
    }

    private getTemplateQuery(guildId: string, templateName: string, caseSensitive: boolean = true): Query<IRaidTemplate> {
        let query: Query<IRaidTemplate>;
        if (caseSensitive) {
            query = {guildId: guildId, name: templateName};
        } else {
            query = {guildId: guildId, name: {$regex: new RegExp(`^${templateName}$`, 'i')}};
        }
        return query;
    }

    public async existsByName(guildId: string, templateName: string, caseSensitive: boolean = true): Promise<boolean> {
        return this.existsByQuery(this.getTemplateQuery(guildId, templateName, caseSensitive));
    }

    public async findTemplate(guildId: string, templateName: string, caseSensitive: boolean = true): Promise<IRaidTemplate> {
        return this.findByQuery(this.getTemplateQuery(guildId, templateName, caseSensitive));
    }

    public async deleteTemplate(guildId: string, templateName: string, caseSensitive: boolean = true): Promise<boolean> {
        const query = this.getTemplateQuery(guildId, templateName, caseSensitive);
        return this.existsByQuery(query).then((exists) => {
            if (exists) {
                return this.deleteByQuery(query);
            }
            return false;
        })
    }

    public async deleteAllTemplates(guildId: string): Promise<number> {
        const query = {guildId: guildId} as Query<IRaidTemplate>;
        return this.deleteManyByQuery(query);
    }

    public async findTemplatesByGuildId(guildId: string): Promise<IRaidTemplate[]> {
        const query = {guildId: guildId} as Query<IRaidTemplate>;
        return this.findManyByQuery(query);
    }
}