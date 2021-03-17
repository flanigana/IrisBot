import { injectable } from 'inversify';
import { Query } from '../interfaces/repositories';
import { GenericRepository } from './generic_repository';
import { GuildTemplate, GuildTemplateDoc } from '../../../models/interfaces/guild_template';
import { Model } from 'mongoose';

@injectable()
export class TemplateRepository<IEntity extends GuildTemplate, Doc extends GuildTemplateDoc>
    extends GenericRepository<IEntity, Doc> {
    
    public constructor(
        model: Model<Doc>
    ) {
        super(model);
    }

    private getTemplateQuery(guildId: string, templateName: string, caseSensitive: boolean = true): Query<IEntity> {
        let query: Query<IEntity>;
        if (caseSensitive) {
            query = {guildId: guildId, name: templateName} as Query<IEntity>;
        } else {
            query = {guildId: guildId, name: {$regex: new RegExp(`^${templateName}$`, 'i')}} as Query<IEntity>;
        }
        return query;
    }

    public async existsByName(guildId: string, templateName: string, caseSensitive: boolean = true): Promise<boolean> {
        return this.existsByQuery(this.getTemplateQuery(guildId, templateName, caseSensitive));
    }

    public async findTemplate(guildId: string, templateName: string, caseSensitive: boolean = true): Promise<IEntity> {
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

    public async deleteAllTemplatesByGuildId(guildId: string): Promise<number> {
        const query = {guildId: guildId} as Query<IEntity>;
        return this.deleteManyByQuery(query);
    }

    public async findTemplatesByGuildId(guildId: string): Promise<IEntity[]> {
        const query = {guildId: guildId} as Query<IEntity>;
        return this.findManyByQuery(query);
    }
}