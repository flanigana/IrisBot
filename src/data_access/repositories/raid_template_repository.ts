import { injectable } from 'inversify';
import { Query } from './repositories';
import { GenericRepository } from './generic_repository';
import { RaidTemplate, RaidTemplateDoc, IRaidTemplate } from '../../models/raid_template';

@injectable()
export class RaidTemplateRepository
    extends GenericRepository<IRaidTemplate, RaidTemplateDoc> {
    
    public constructor() {
        super(RaidTemplate);
    }

    public async existsByName(guildId: string, templateName: string): Promise<boolean> {
        const query = {guildId: guildId, name: templateName} as Query<IRaidTemplate>;
        return this.existsByQuery(query);
    }

    public async findTemplate(guildId: string, templateName: string): Promise<IRaidTemplate> {
        const query = {guildId: guildId, name: templateName} as Query<IRaidTemplate>;
        return this.findByQuery(query);
    }

    public async findTemplatesByGuildId(guildId: string): Promise<IRaidTemplate[]> {
        const query = {guildId: guildId} as Query<IRaidTemplate>;
        return this.findManyByQuery(query);
    }

    public async deleteTemplate(guildId: string, templateName: string): Promise<boolean> {
        const query = {guildId: guildId, name: templateName} as Query<IRaidTemplate>;
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
}